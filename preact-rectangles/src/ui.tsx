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
  Dropdown,
  DropdownOption,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h, JSX, Fragment } from "preact";
import { useCallback, useState, useEffect } from "preact/hooks";

import {
  CloseHandler,
  CreateAvatarHandler,
  AvatarCreatedHandler,
} from "./types";

function Plugin() {
  const [value, setValue] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [componentName, setComponentName] = useState<string>("avatar");

  // Listen for avatar creation completion at the top level
  useEffect(() => {
    return on<AvatarCreatedHandler>("AVATAR_CREATED", () => {
      emit<CloseHandler>("CLOSE");
    });
  }, []);

  const handleInput = useCallback(function (
    event: JSX.TargetedEvent<HTMLTextAreaElement>
  ) {
    const newValue = event.currentTarget.value;
    setValue(newValue);
  },
  []);

  const handleComponentNameChange = useCallback(function (
    event: JSX.TargetedEvent<HTMLInputElement>
  ) {
    const newValue = event.currentTarget.value;
    setComponentName(newValue);
  },
  []);

  const parseAvatarProps = (code: string) => {
    const props: Record<string, any> = {};

    // Extract props from JSX - match <Avatar ... />
    const avatarRegex = /<Avatar\s+([\s\S]+?)\/>/g;
    const match = avatarRegex.exec(code);

    if (!match) {
      return null;
    }

    const propsString = match[1];

    // Parse individual props
    // Handle string props: prop="value" or prop='value'
    const stringPropRegex = /(\w+)=["']([^"']+)["']/g;
    let propMatch;

    while ((propMatch = stringPropRegex.exec(propsString)) !== null) {
      props[propMatch[1]] = propMatch[2];
    }

    // Handle boolean props: prop={true/false} or just prop (true)
    const booleanPropRegex = /(\w+)(?:=\{(true|false)\}|\s|\/|>)/g;
    while ((propMatch = booleanPropRegex.exec(propsString)) !== null) {
      const propName = propMatch[1];
      const propValue = propMatch[2];

      // If no explicit value, it's a truthy boolean prop
      if (!propValue && !props[propName]) {
        props[propName] = true;
      } else if (propValue) {
        props[propName] = propValue === "true";
      }
    }

    // Handle number props: prop={123}
    const numberPropRegex = /(\w+)=\{(\d+)\}/g;
    while ((propMatch = numberPropRegex.exec(propsString)) !== null) {
      props[propMatch[1]] = parseInt(propMatch[2], 10);
    }

    return props;
  };

  const handleCreateAvatar = useCallback(
    function () {
      if (!value.trim()) {
        setResult("Please paste Storybook code first");
        return;
      }

      if (!componentName.trim()) {
        setResult("Please enter a component name");
        return;
      }

      setIsProcessing(true);
      setResult("");

      try {
        const props = parseAvatarProps(value);

        if (!props) {
          setResult(
            'No Avatar component found in the pasted code.\n\nMake sure your code includes something like:\n<Avatar name="John Doe" size="large" />'
          );
          setIsProcessing(false);
          return;
        }

        // Send props and component name to main thread
        emit<CreateAvatarHandler>("CREATE_AVATAR", {
          props,
          componentName,
        });

        setResult(
          `${componentName} will be created with props:\n\n${JSON.stringify(
            props,
            null,
            2
          )}\n\nCheck your Figma canvas!`
        );
        setIsProcessing(false);
      } catch (error) {
        setResult("Error parsing Avatar props: " + (error as Error).message);
        setIsProcessing(false);
      }

      // Plugin will auto-close when main thread emits "AVATAR_CREATED"
    },
    [value, componentName]
  );

  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>("CLOSE");
  }, []);

  const componentOptions: Array<DropdownOption> = [
    { value: "avatar", text: "avatar" },
    { value: "button", text: "button" },
  ];

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Muted>Figma Component Name</Muted>
      </Text>
      <VerticalSpace space="extraSmall" />
      <Dropdown
        onChange={handleComponentNameChange}
        options={componentOptions}
        value={componentName}
      />
      <VerticalSpace space="medium" />
      <Text>
        <Muted>Paste Storybook Avatar Implementation</Muted>
      </Text>
      <VerticalSpace space="small" />
      <TextboxMultiline
        onInput={handleInput}
        value={value}
        rows={10}
        placeholder={`Paste your Storybook code here...\n\nExample:\n<Avatar\n  name="John Doe"\n  size="large"\n  variant="circle"\n  showStatus={true}\n/>`}
      />
      <VerticalSpace space="medium" />
      <Button fullWidth onClick={handleCreateAvatar} disabled={isProcessing}>
        {isProcessing ? "Building..." : "Build on Canvas"}
      </Button>
      {isProcessing && (
        <Fragment>
          <VerticalSpace space="small" />
          <LoadingIndicator />
        </Fragment>
      )}
      {result && (
        <Fragment>
          <VerticalSpace space="medium" />
          <Text>
            <Muted>Result:</Muted>
          </Text>
          <VerticalSpace space="small" />
          <TextboxMultiline value={result} rows={8} disabled />
        </Fragment>
      )}
      <VerticalSpace space="extraLarge" />
      <Columns space="extraSmall">
        <Button fullWidth onClick={handleCloseButtonClick} secondary>
          Close
        </Button>
      </Columns>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
