// // This plugin counts the number of layers, ignoring instance sublayers,
// // in the document
// let count = 0
// function traverse(node) {
//   if("children" in node) {
//     count ++
// 		if (node.type !== "INSTANCE") {
// 			for (const child of node.children) {
// 				traverse(child)
// 			}
// 		}
//   }
// }
// traverse(figma.root)
// alert(count)
// figma.closePlugin()
// function turnFrameIntoComponent() {
// 	const selection: SceneNode = figma.currentPage.selection[0]
// 	if (!selection) { return }
// 	if (selection.type !=='FRAME') { return } // 이렇게 FrameNode임을 확인해 주어야
// 	const component = figma.createComponent()
// 	component.x = selection.x
// 	component.y = selection.y
// 	component.resize(selection.width, selection.height)
// 	// Copy children into new node
// 	for (const child of selection.children) {
// 		component.appendChild(child)
// 	}
// 	selection.remove()
// }
// function supportsChildren(node: SceneNode):
//   node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode
// {
//   return node.type === 'FRAME' || node.type === 'GROUP' ||
//          node.type === 'COMPONENT' || node.type === 'INSTANCE' ||
//          node.type === 'BOOLEAN_OPERATION'
// }
// const selection = figma.currentPage.selection[0]
// if (supportsChildren(selection)) {
//   // Inside this if statement, selection always has .children property
//   console.log(selection.children)
// }
// // Prints the number of children. 'as NodeWithChildren'
// // tells the compiler you're sure about what you're doing
// const selection = figma.currentPage.selection[0]
// console((selection as NodeWithChildren).children)
