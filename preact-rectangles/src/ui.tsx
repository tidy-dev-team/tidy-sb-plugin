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

  // Listen for messages from main thread
  useEffect(() => {
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg.type === "SEARCH_RESULT") {
        setSearchResult(msg.result);
        setIsSearching(false);
      }
    };
  }, []);

  const handleInput = useCallback(function (
    event: JSX.TargetedEvent<HTMLTextAreaElement>
  ) {
    const newValue = event.currentTarget.value;
    console.log(newValue);
    setValue(newValue);
  },
  []);

  const searchCodeConnect = useCallback(
    function () {
      if (!value.trim()) {
        setSearchResult("Please paste some code first");
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
    [value]
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
        <Muted>Paste Storybook Implementation Code</Muted>
      </Text>
      <VerticalSpace space="small" />
      <TextboxMultiline
        onInput={handleInput}
        value={value}
        rows={10}
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
          <TextboxMultiline value={searchResult} rows={8} disabled />
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
