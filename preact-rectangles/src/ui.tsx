import {
  Button,
  Columns,
  Container,
  Muted,
  render,
  Text,
  TextboxMultiline,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h, JSX } from "preact";
import { useCallback, useState } from "preact/hooks";

import { CloseHandler, CreateRectanglesHandler } from "./types";

function Plugin() {
  const [count, setCount] = useState<number | null>(5);
  const [countString, setCountString] = useState("5");
  const [value, setValue] = useState<string>("");

  const handleInput = useCallback(function (
    event: JSX.TargetedEvent<HTMLTextAreaElement>
  ) {
    const newValue = event.currentTarget.value;
    console.log(newValue);
    setValue(newValue);
  },
  []);

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
        <Muted>Paste SB Code here:</Muted>
      </Text>
      <VerticalSpace space="small" />
      <TextboxMultiline
        style={{ height: "60%" }}
        onInput={handleInput}
        value={value}
      />
      <VerticalSpace space="medium" />
      <Columns space="extraSmall">
        <Button fullWidth onClick={handleCreateRectanglesButtonClick}>
          Build
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
