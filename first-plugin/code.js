function runPlugin() {
    // Get the number of selected elements
    let selectedElements = figma.currentPage.selection
    let selected_frame_child = figma.selectedElements.findAll

    //  selection gives an array of all the selected elements

    console.log(selected_frame_child)

    // array[1] = 
    // array[0] 
    // array[0].rectangle8 != arguments
    // print 
    // Display error messages on invalid selection
    if (selectedElements === 0) {
        figma.closePlugin('No element selected!')
        return
    }

    if (selectedElements > 1) {
        figma.closePlugin('Please select a single element')
        return
    }

    // Find the name of the selected element
    let selectedName = figma.currentPage.selection[0].name

    // console.log(selectedName)

    // Callback function for findAll()
    function hasSameName(node) {
        return node.name === selectedName
    }

    // Get all the elements with the same name as the selected one
    let withSameName = figma.currentPage.findAll(hasSameName)

    // Select all elements with the same name as the selected one
    figma.currentPage.selection = withSameName

    figma.closePlugin(withSameName.length + ' Elements selected')
    return
}

runPlugin()