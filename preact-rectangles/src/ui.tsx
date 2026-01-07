import {
  Button,
  Columns,
  Container,
  Muted,
  render,
  Text,
  TextboxMultiline,
  VerticalSpace,
  LoadingIndicator,
  Textbox,
} from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h, JSX, Fragment } from "preact";
import { useCallback, useState, useEffect } from "preact/hooks";

import { CloseHandler, CreateRectanglesHandler } from "./types";

function Plugin() {
  const [count, setCount] = useState<number | null>(5);
  const [countString, setCountString] = useState("5");
  const [value, setValue] = useState<string>("");
  const [searchResult, setSearchResult] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [accessToken, setAccessToken] = useState<string>("");

  // Listen for messages from main thread
  useEffect(() => {
    window.onmessage = async (event) => {
      const msg = event.data.pluginMessage;

      if (msg.type === "SEARCH_RESULT") {
        setSearchResult(msg.result);
        setIsSearching(false);
      }

      if (msg.type === "FETCH_CODE_CONNECT") {
        if (!accessToken) {
          setSearchResult(
            "Please enter your Figma Access Token first.\n\nYou can generate one at: Settings → Account → Personal Access Tokens"
          );
          setIsSearching(false);
          return;
        }

        try {
          // Fetch code connect data from Figma REST API
          const response = await fetch(
            `https://api.figma.com/v1/files/${msg.fileKey}/code_connect`,
            {
              headers: {
                "X-Figma-Token": accessToken,
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `API request failed: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data.code_connect || data.code_connect.length === 0) {
            setSearchResult(
              "No Code Connect snippets found in this file.\n\nMake sure Code Connect has been set up using the Code Connect CLI."
            );
            setIsSearching(false);
            return;
          }

          // Search through code connect snippets
          const results = [];

          for (const snippet of data.code_connect) {
            if (snippet.code) {
              for (const importPath of msg.imports) {
                if (snippet.code.includes(importPath)) {
                  results.push({
                    nodeName: snippet.figma_node || "Unknown",
                    code: snippet.code,
                    matchedImport: importPath,
                    language: snippet.language || "unknown",
                  });
                }
              }
            }
          }

          if (results.length === 0) {
            setSearchResult(
              `No matching imports found.\n\nSearched for:\n${msg.imports.join(
                "\n"
              )}\n\nFound ${
                data.code_connect.length
              } Code Connect snippet(s) in file, but none matched your imports.`
            );
          } else {
            const resultText = results
              .map(
                (r) =>
                  `Component: ${r.nodeName}\nMatched: ${
                    r.matchedImport
                  }\nLanguage: ${r.language}\n\nCode:\n${
                    r.code
                  }\n\n${"=".repeat(50)}\n`
              )
              .join("\n");

            setSearchResult(
              `Found ${results.length} match(es):\n\n${resultText}`
            );
          }

          setIsSearching(false);
        } catch (error) {
          setSearchResult(
            "Error fetching Code Connect data: " +
              (error as Error).message +
              "\n\nMake sure your access token is valid and has the necessary permissions."
          );
          setIsSearching(false);
        }
      }
    };
  }, [accessToken]);

  const handleInput = useCallback(function (
    event: JSX.TargetedEvent<HTMLTextAreaElement>
  ) {
    const newValue = event.currentTarget.value;
    console.log(newValue);
    setValue(newValue);
  },
  []);

  const handleTokenInput = useCallback(function (
    event: JSX.TargetedEvent<HTMLInputElement>
  ) {
    const newValue = event.currentTarget.value;
    setAccessToken(newValue);
  },
  []);

  const searchCodeConnect = useCallback(
    function () {
      if (!value.trim()) {
        setSearchResult("Please paste some code first");
        return;
      }

      if (!accessToken.trim()) {
        setSearchResult(
          "Please enter your Figma Access Token first.\n\nGenerate one at: Settings → Account → Personal Access Tokens"
        );
        return;
      }

      setIsSearching(true);
      setSearchResult("");

      try {
        // Extract import statements from the pasted code
        const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
        const imports = [];
        let match;

        while ((match = importRegex.exec(value)) !== null) {
          imports.push(match[1]);
        }

        if (imports.length === 0) {
          setSearchResult("No import statements found in the pasted code");
          setIsSearching(false);
          return;
        }

        // Send message to main thread to search Code Connect
        emit("SEARCH_CODE_CONNECT", { imports, fullCode: value });
      } catch (error) {
        setSearchResult(
          "Error searching Code Connect: " + (error as Error).message
        );
        setIsSearching(false);
      }
    },
    [value, accessToken]
  );

  const handleCreateRectanglesButtonClick = useCallback(
    function () {
      if (count !== null) {
        emit<CreateRectanglesHandler>("CREATE_RECTANGLES", count);
      }
    },
    [count]
  );

  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>("CLOSE");
  }, []);

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Muted>Figma Access Token (Required)</Muted>
      </Text>
      <VerticalSpace space="extraSmall" />
      <Textbox
        onInput={handleTokenInput}
        value={accessToken}
        password
        placeholder="figd_..."
      />
      <VerticalSpace space="small" />
      <Text>
        <Muted>Generate at: Settings → Account → Personal Access Tokens</Muted>
      </Text>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>Paste Storybook Implementation Code</Muted>
      </Text>
      <VerticalSpace space="small" />
      <TextboxMultiline
        onInput={handleInput}
        value={value}
        rows={8}
        placeholder="Paste your Storybook code here..."
      />
      <VerticalSpace space="medium" />
      <Button fullWidth onClick={searchCodeConnect} disabled={isSearching}>
        {isSearching ? "Searching..." : "Search Code Connect"}
      </Button>
      {isSearching && (
        <Fragment>
          <VerticalSpace space="small" />
          <LoadingIndicator />
        </Fragment>
      )}
      {searchResult && (
        <Fragment>
          <VerticalSpace space="medium" />
          <Text>
            <Muted>Result:</Muted>
          </Text>
          <VerticalSpace space="small" />
          <TextboxMultiline value={searchResult} rows={10} disabled />
        </Fragment>
      )}
      <VerticalSpace space="extraLarge" />
      <Columns space="extraSmall">
        <Button fullWidth onClick={handleCreateRectanglesButtonClick}>
          Create
        </Button>
        <Button fullWidth onClick={handleCloseButtonClick} secondary>
          Close
        </Button>
      </Columns>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
