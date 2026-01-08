import { once, showUI } from "@create-figma-plugin/utilities";

import { CloseHandler, CreateAvatarHandler } from "./types";

export default function () {
  once<CreateAvatarHandler>("CREATE_AVATAR", async function (data) {
    try {
      const { props, componentName } = data;

      // Find the Component Set (not individual components)
      const componentSet = figma.root.findOne(
        (node) => 
          node.type === "COMPONENT_SET" && 
          node.name.toLowerCase() === componentName.toLowerCase()
      ) as ComponentSetNode;

      if (!componentSet) {
        // Debug: show what's available
        const allComponentSets = figma.root.findAll(
          (node) => node.type === "COMPONENT_SET"
        ) as ComponentSetNode[];
        
        const componentSetList = allComponentSets
          .map(c => `• ${c.name}`)
          .join("\n");
        
        figma.notify(
          `❌ Component Set "${componentName}" not found.\n\nAvailable Component Sets:\n${componentSetList || "No component sets found"}`, 
          { error: true, timeout: 10000 }
        );
        return;
      }

      figma.notify(`Found Component Set: ${componentSet.name}`);

      // Get the default variant (first child component)
      const defaultVariant = componentSet.defaultVariant || componentSet.children[0] as ComponentNode;

      if (!defaultVariant || defaultVariant.type !== "COMPONENT") {
        figma.notify("❌ Could not find a variant in the component set", { error: true });
        return;
      }

      // Create an instance of the default variant
      const instance = defaultVariant.createInstance();

      // Position the instance in the center of the viewport
      const viewportCenter = figma.viewport.center;
      instance.x = viewportCenter.x;
      instance.y = viewportCenter.y;

      // Get available properties from the component
      const availableProps = Object.keys(instance.componentProperties || {});
      console.log("Available component properties:", availableProps);

      // Map common prop names to Figma component properties
      // These match your Figma component's actual property names
      const propertyMapping: Record<string, string> = {
        size: "size",
        type: "type",
        shape: "shape",
        outline: "outline",
        lowerBadge: "lower badge",
        upperBadge: "upper badge",
        initials: "initials",
      };

      // Separate text properties from other properties
      const propertiesToSet: Record<string, any> = {};
      const textPropertiesToSet: Record<string, string> = {};
      
      for (const [propKey, propValue] of Object.entries(props)) {
        const figmaPropertyName = propertyMapping[propKey];
        
        if (figmaPropertyName && availableProps.includes(figmaPropertyName)) {
          // Check if it's a text property
          const propDef = instance.componentProperties[figmaPropertyName];
          if (propDef && propDef.type === "TEXT") {
            textPropertiesToSet[figmaPropertyName] = String(propValue);
          } else {
            propertiesToSet[figmaPropertyName] = propValue;
          }
        }
      }

      // Set non-text properties first
      if (Object.keys(propertiesToSet).length > 0) {
        try {
          instance.setProperties(propertiesToSet);
        } catch (error) {
          console.error("Property setting error:", error);
        }
      }

      // Set text properties by finding and updating text nodes
      if (Object.keys(textPropertiesToSet).length > 0) {
        try {
          // Find text nodes in the instance and update them
          const textNodes = instance.findAll(node => node.type === "TEXT") as TextNode[];
          
          for (const [propName, propValue] of Object.entries(textPropertiesToSet)) {
            // Try to set via component properties first
            try {
              instance.setProperties({ [propName]: propValue });
            } catch (e) {
              // If that fails, try to find and update the text node directly
              for (const textNode of textNodes) {
                await figma.loadFontAsync(textNode.fontName as FontName);
                textNode.characters = propValue;
              }
            }
          }
        } catch (error) {
          console.error("Text property setting error:", error);
        }
      }

      const allSetProps = [...Object.keys(propertiesToSet), ...Object.keys(textPropertiesToSet)];
      
      if (allSetProps.length > 0) {
        figma.notify(
          `✅ ${componentSet.name} created with props: ${allSetProps.join(", ")}`
        );
      } else {
        figma.notify(
          `✅ ${componentSet.name} created\n\nAvailable properties: ${availableProps.join(", ") || "none"}`,
          { timeout: 5000 }
        );
      }

      // Select and zoom to the newly created instance
      figma.currentPage.selection = [instance];
      figma.viewport.scrollAndZoomIntoView([instance]);

    } catch (error) {
      figma.notify(`❌ Error: ${(error as Error).message}`, { error: true });
      console.error("Plugin error:", error);
    }
  });

  once<CloseHandler>("CLOSE", function () {
    figma.closePlugin();
  });

  showUI({
    height: 560,
    width: 400,
  });
}