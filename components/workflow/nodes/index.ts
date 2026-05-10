import RequestInputsNode from './RequestInputsNode'
import CropImageNode     from './CropImageNode'
import GeminiNode        from './GeminiNode'
import ResponseNode      from './ResponseNode'

export const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage:     CropImageNode,
  gemini:        GeminiNode,
  response:      ResponseNode,
}
