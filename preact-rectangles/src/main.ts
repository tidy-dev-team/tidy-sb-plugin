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
      const fileKey = figma.fileKey
      
      if (!fileKey) {
        figma.ui.postMessage({
          type: 'SEARCH_RESULT',
          result: 'Error: Could not get file key. Make sure the file is saved.'
        })
        return
      }
      
      // Send request to UI to fetch via REST API
      figma.ui.postMessage({
        type: 'FETCH_CODE_CONNECT',
        fileKey: fileKey,
        imports: data.imports
      })
      
    } catch (error) {
      figma.ui.postMessage({
        type: 'SEARCH_RESULT',
        result: 'Error: ' + (error as Error).message
      })
    }
  })
  
  showUI({ width: 400, height: 600 })
}