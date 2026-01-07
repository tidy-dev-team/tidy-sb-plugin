import { once, on, showUI } from '@create-figma-plugin/utilities'

import { CloseHandler, CreateRectanglesHandler } from './types'

export default function () {
  once<CloseHandler>('CLOSE', function () {
    figma.closePlugin()
  })
  
  on<CreateRectanglesHandler>('CREATE_RECTANGLES', function (count: number) {
    const nodes: Array<SceneNode> = []
    for (let i = 0; i < count; i++) {
      const rect = figma.createRectangle()
      rect.x = i * 150
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }]
      figma.currentPage.appendChild(rect)
      nodes.push(rect)
    }
    figma.currentPage.selection = nodes
    figma.viewport.scrollAndZoomIntoView(nodes)
  })
  
  on('SEARCH_CODE_CONNECT', async function (data: { imports: string[], fullCode: string }) {
    try {
      // Search for components with dev resources (which may include Code Connect)
      const allComponents = figma.root.findAllWithCriteria({
        types: ['COMPONENT', 'COMPONENT_SET']
      })
      
      if (allComponents.length === 0) {
        figma.ui.postMessage({
          type: 'SEARCH_RESULT',
          result: 'No components found in this file'
        })
        return
      }
      
      const results = []
      
      // Check each component for dev resources
      for (const component of allComponents) {
        try {
          // Get dev resources (this includes Code Connect snippets)
          if ('devStatus' in component) {
            const devStatus = (component as any).devStatus
            
            // Try to access any attached code or documentation
            const pluginData = component.getSharedPluginData('figma', 'code-connect')
            
            if (pluginData) {
              // Check if any of the imports match
              for (const importPath of data.imports) {
                if (pluginData.includes(importPath)) {
                  results.push({
                    nodeName: component.name,
                    nodeId: component.id,
                    code: pluginData,
                    matchedImport: importPath
                  })
                }
              }
            }
          }
        } catch (err) {
          // Continue to next component
          continue
        }
      }
      
      // Also check plugin data on all nodes
      const allNodes = figma.root.findAll()
      
      for (const node of allNodes) {
        try {
          // Check for any plugin data that might contain code snippets
          const keys = ['code-connect', 'codeConnect', 'devMode', 'snippet']
          
          for (const key of keys) {
            try {
              const pluginData = node.getSharedPluginData('figma', key)
              
              if (pluginData) {
                for (const importPath of data.imports) {
                  if (pluginData.includes(importPath)) {
                    const isDuplicate = results.some(r => r.nodeId === node.id)
                    if (!isDuplicate) {
                      results.push({
                        nodeName: node.name,
                        nodeId: node.id,
                        code: pluginData,
                        matchedImport: importPath
                      })
                    }
                  }
                }
              }
            } catch (err) {
              // Key doesn't exist, continue
              continue
            }
          }
        } catch (err) {
          continue
        }
      }
      
      if (results.length === 0) {
        figma.ui.postMessage({
          type: 'SEARCH_RESULT',
          result: `No Code Connect data found matching your imports.\n\nSearched for:\n${data.imports.join('\n')}\n\nNote: Make sure Code Connect is properly set up in this Figma file. You may need to use the official Code Connect CLI to publish snippets to this file.`
        })
      } else {
        const resultText = results.map(r => 
          `Found in: ${r.nodeName}\nMatched import: ${r.matchedImport}\n\nCode:\n${r.code}\n\n${'='.repeat(50)}\n`
        ).join('\n')
        
        figma.ui.postMessage({
          type: 'SEARCH_RESULT',
          result: `Found ${results.length} match(es):\n\n${resultText}`
        })
      }
      
    } catch (error) {
      figma.ui.postMessage({
        type: 'SEARCH_RESULT',
        result: 'Error: ' + (error as Error).message + '\n\nThis feature requires Code Connect to be set up in your Figma file. Please refer to Figma\'s Code Connect documentation: https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Code-Connect'
      })
    }
  })
  
  showUI({ width: 400, height: 600 })
}