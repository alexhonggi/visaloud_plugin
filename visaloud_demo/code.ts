function supportsChildren(node: SceneNode):
  node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode
{
  return node.type === 'FRAME' || node.type === 'GROUP' ||
         node.type === 'COMPONENT' || node.type === 'INSTANCE' ||
         node.type === 'BOOLEAN_OPERATION'
}
let nCount = 0
const nTypeCounts: Map<NodeType, number> = new Map

function visit(node) {  // node의 children component 내부까지 traverse 하는 재귀함수
  nTypeCounts.set(node.type, 1 + (nTypeCounts.get(node.type) | 0))
  nCount++
  if (node.children) node.children.forEach(visit)
  if (node.width !== oldnode.wdi) 출력
  // console.log(node)
}

let changeCount = 0
// (0) 선택이 바뀌면 콘솔 로그에 changed 출력
figma.on("selectionchange", () => { 
  console.log("changed", changeCount)
  changeCount += 1
})
console.log("before")
// figma.currentPage.selection = []
console.log("after")


// let selectedFrame = figma.currentPage.selection[0]
// if (selectedFrame.type != 'FRAME') { return }

// const component = figma.createComponent()
// component.resizeWithoutConstraints(selectedFrame.width, selectedFrame.height)
// for (const child of selectedFrame.children) {
//   component.appendChild(child)
// }



function runPlugin() {
  // Skip over invisible nodes and their descendants inside instances for faster performance
  figma.skipInvisibleInstanceChildren = true

  let nodeCount = 0
  const nodeTypeCounts: Map<NodeType, number> = new Map

  // (1) 선택된 프레임 내부의 일을 캡쳐한다.
  let selectedElements = figma.currentPage.selection[0]
  if (selectedElements.type != 'FRAME') { return }
  
  const component = figma.createComponent()
  component.resizeWithoutConstraints(selectedElements.width, selectedElements.height)
  for (const child of selectedElements.children) {
    component.appendChild(child)
  }
  // let selectedFrame = if(figma.selectedElements.isFrame) figma.currentPage.selection
  // let selected_frame_child = figma.selectedElements.findAll
  // if (selectedElements === 0) {
  //   figma.closePlugin('No element selected!')
  //   return
  // }
  // if (selectedElements > 1) {
  //   figma.closePlugin('Please select a single element')
  //   return
  // }

  // Find the name of the selected element
  // let selectedName = figma.currentPage.selection[0].name

  // Finds the first text node with more than 100 characters
  // const node = node.findOne(node => node.type === 'TEXT' && node.characters.length > 100)

  // Finds all empty frame nodes
  // const nodes = node.findAll(node => node.type === 'FRAME' && node.children.length === 0)


  function visit(node) {  // node의 children component 내부까지 traverse 하는 재귀함수
    nodeTypeCounts.set(node.type, 1 + (nodeTypeCounts.get(node.type) | 0))
    nodeCount++
    if (node.children) node.children.forEach(visit)
    // console.log(node)
  }

  // visit(figma.root)
  // console.log(selectedElements)
  // console.log(figma.selectedElements.findAll)

  if(supportsChildren(selectedElements)) {
    console.log(selectedElements.children)
  }
  // console.log('자식')
  visit(selectedElements)

  let text = `Node count: ${nodeCount}\n`
  let nodeTypes = Array.from(nodeTypeCounts.entries())
  nodeTypes.sort((a, b) => b[1] - a[1])
  text += `Node types:` + nodeTypes.map(([k,v]) => `\n  ${k}: ${v}`).join('')

  figma.showUI(`
    <span style="white-space:pre-wrap;">${text}</span>
  `, {width: 500, height: 500})
  // let nodeCount = 0
  // const nodeTypeCounts: Map<NodeType, number> = new Map

  // function visit(node) {
  //   nodeTypeCounts.set(node.type, 1 + (nodeTypeCounts.get(node.type) | 0))
  //   nodeCount++
  //   if (node.children) node.children.forEach(visit)
  // }

  // visit(figma.root)

  // let text = `Node count: ${nodeCount}\n`
  // let nodeTypes = Array.from(nodeTypeCounts.entries())
  // nodeTypes.sort((a, b) => b[1] - a[1])
  // text += `Node types:` + nodeTypes.map(([k,v]) => `\n  ${k}: ${v}`).join('')

  // figma.showUI(`
  //   <span style="white-space:pre-wrap;">${text}</span>
  // `, {width: 500, height: 500})
}

runPlugin()