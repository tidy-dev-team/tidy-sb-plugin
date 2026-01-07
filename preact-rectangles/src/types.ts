import { EventHandler } from '@create-figma-plugin/utilities'

export interface CreateRectanglesHandler extends EventHandler {
  name: 'CREATE_RECTANGLES'
  handler: (count: number) => void
}

export interface CloseHandler extends EventHandler {
  name: 'CLOSE'
  handler: () => void
}

export interface CloseHandler {
  name: 'CLOSE'
}

export interface CreateRectanglesHandler {
  name: 'CREATE_RECTANGLES'
  data: number
}

export interface SearchCodeConnectHandler {
  name: 'SEARCH_CODE_CONNECT'
  data: {
    imports: string[]
    fullCode: string
  }
}