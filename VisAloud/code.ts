/* 순서
 * 1. Plugin 실행 시 onRun에서 initialFrame에 관찰할 프레임 저장. 모든 정보 갱신은 해당 프레임 기준으로 진행.
 *
 * 2. 실행 이후, 유저의 선택 사항이 바뀔 때마다 onSelections에서 다음 순서 진행:
 *    (1) selectionChange가 trigger 될 때마다 initialFrame을 JSON.stringify하여 historyFrame에 저장
 *        : clientStorage API 이용. key와 데이터를 함께 넘겨주기
 *          saveToStorage(key, data)를 통해 key와 data를 넘겨주면, 
 *          figma.clientStorage.setAsync(key, JSON.stringify(data)) 통해 로컬 저장소에 저장 (plugin에 대응)
 *    * 만약 onSelection에서 선택된 Node가 initialFrame의 children이 아니면 (isChildrenOfInitialFrame)
 *      : 해당 선택을 무시한다. 
 *    * 차라리, initialFrame을 Page 전체로 하는 건 어떨까?
 * 
 * 3. 관찰자가 두 개의 인덱스를 고르면, 해당 key에 대응되는 프레임을 historyFrame으로부터 가져온다.
 *    (1) key는 어떻게 정하는가?
 *        : 저장되는 순서? selectionChange에 대응되게 cnt를 하나 만들어서,
 *          figma가 onRun일때 이 cnt를 0으로 초기화, (cnt는 전역변수) 
 *          selectionChange마다 이 cnt를 ++하고 key로 이용
 *        - 문제점
 *          : 관찰자가 이용할 때 이 key를 보고 필요한 시점을 어떻게 파악하는가? -> 다른 방법 생각 (visualize)
 *    (2) Storage에 저장된 frame은 어떻게 가져오는가?
 *        : clientStorage API 이용. key를 이용해, 
 *          figma.clientStorage.getAsync(key)로 가져오고,
 *          stringify한 JSON data를 parse하여 가져온다. 
 * 
 * 4. 두 프레임을 searchDifference 함수를 이용해, Frame의 Children을 traverse하면서 다른 점을 UI에 출력
 *    (1) searchDifference 함수
 *        : 기본 방식은 traverse(visit) 함수와 같다. 
 *          다만, (1) 비교하는 정보들을 정하거나 
 *               (2) 일단 다른점을 비교하여 찾고, 그 값에 해당하는 필드 이름을 가져와서 출력
 *    (2) UI 출력 어떻게? 필드: 값 -> 값
 *        : 필드가 다른 Node의 children일 수 있으므로, 필드를 어떻게 표시해야 할지 고민해보기
 *          만약 다른 점을 UI로 표시할 수 있다면, best (해당 변경점을 빨간색 레이아웃으로 표현하면 된다)
 * 
 * 5. historyFrame을 통해 가져온 프레임을 UI 혹은 해당 figma canvas에 출력하여, 유저가 확인할 수 있도록 하기.
 *    (1) 방법 고민중.
 * 
 */

/*===== Global Variables =====*/
const debug = true;

let initialFrameId;
let initialFrameGlobal: FrameNode;
let keycount = 0; // key에 들어갈 값 

/*===== Compare Function =====*/
function ObjCompare(obj1, obj2) {
  const blacklist = ['parent', 'children', 'removed']; 
  const obj1_keys = Object.keys(obj1);
  const obj2_keys = Object.keys(obj2);
  if (obj1_keys.length !== obj2_keys.length) {
    return false
  }
  for (let i of obj1_keys) {
    if (!(i in blacklist)) {
      if(obj1[i] !== obj2[i]) {
        console.log('diff in', i, ':', obj1[i], '->', obj2[i]);
      }
    }
  }

  // 1. Height 
  // if(obj1.Height !== obj2.Height) {
  //   console.log('Height:', obj1.Height, '->', obj2.Height);
  // }
};

/*===== Node to Object =====*/
const nodeToObject = (node) => {
  const props = Object.entries(Object.getOwnPropertyDescriptors(node.__proto__));
  const blacklist = ['parent', 'children', 'removed'];
  let obj: any = { id: node.id, type: node.type, children: undefined };
	if (node.parent) obj.parent = { id: node.parent.id, type: node.type };
  for (const [name, prop] of props) {
    if (prop.get && blacklist.indexOf(name) < 0){
      obj[name] = prop.get.call(node);
      // if (typeof obj[name] === 'symbol') obj[name] = 'Mixed';
    }
  }
  // if (filterText.trim() !== '') {
	// 	const filteredProperties = Object.entries(obj)
	// 		.filter(
	// 			entry =>
	// 				entry[0].toLowerCase().includes(filterText.toLowerCase()) ||
	// 				String(entry[1])
	// 					.toLowerCase()
	// 					.includes(filterText.toLowerCase())
	// 		)
	// 		.map(entry => entry[0]);
	// 	const newObj = filteredProperties.length > 0 ? { id: obj.id, name: obj.name } : {};
	// 	filteredProperties.forEach(property => {
	// 		newObj[property] = obj[property];
	// 	});
	// 	obj = newObj;
	// }
  // children traverse
	if (node.children) obj.children = node.children.map(child => nodeToObject(child));
	if (node.masterComponent) obj.masterComponent = nodeToObject(node.masterComponent);
	return obj;
}

/*===== Storage Functions =====*/
	const saveToStorage = async (key, data) => {
    try {
			await figma.clientStorage.setAsync(key, JSON.stringify(data));
      console.log('저장되는 raw data', data);
      console.log('saved', JSON.stringify(data));
      console.log('saved', data.type);
    } catch (err) {
      console.log('while saving to storage catch:', err);
      // showNotification('warning', 'reject');
    }
	};

	const getFromStorage = async key => {
    try {
			const data = await figma.clientStorage.getAsync(key);
      console.log(data);
      console.log(data.type);
			return JSON.parse(data);
    } catch (err) {
      console.log('while getting from storage catch:', err);
      // showNotification('warning', 'reject');
    }
	};

  async function keysStorage() {
    try {
      const keys = await figma.clientStorage.keysAsync();
      return keys;
    } catch (err) {
      console.log('keysAsync failed', err);
    }
  };

async function onSelections() {
  // [selections, selectionDescription] = handleSelections({'NODE'});
  // let prevSelection = selections;
  // const selections = figma.currentPage.selection; // const 쓰는게 맞을까? THINK: 다른 폴더에 함수 정의하여 따로 정의
  // if (prevSelection == figma.currentPage.selection) { return }
  // const selections = figma.currentPage.selection[0]; 
  // prevSelection = selections;
  // keycount++;
  // // if (selections.type != 'RECTANGLE') { 
  // //   console.log('선택된 항목이 프레임이 아닙니다')  // 나중에 console log 아닌 UI message로 바꾸기 (혹은 toast?)
  // //   return 
  // // }
  // const selectionsObject = nodeToObject(selections);
  // console.log('selectionsObject', selectionsObject);
  let initialFrameSelection: SceneNode
  // (figma.currentPage) 안에 있는 모든 children에 대해 {
  //   if(해당 component.id == initialFrameGlobal.id)
  //   initialFrameSelection = 해당 component
  // }
  initialFrameSelection = figma.currentPage.findAll(n => n.id === initialFrameGlobal.id)[0]
  saveToStorage(String(keycount), initialFrameGlobal as FrameNode); // 일단 currentPage, 나중에 initialFrame
  // let clonedFrame = initialFrameGlobal.clone();
  // console.log(clonedFrame);
  // console.log(initialFrameGlobal);
  if(debug) { console.log('저장', keycount); 
    // console.log(selections);
  }
}


figma.ui.onmessage = async msg => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  console.log('msg', msg);
  // 1. compare 
  // if (msg.type === 'compare')

  if (msg.type === 'search') {
    // const nodes: SceneNode[] = [];
    // for (let i = 0; i < msg.count; i++) {
    //   const rect = figma.createRectangle();
    //   rect.x = i * 150;
    //   rect.fills = [{type: 'SOLID', color: {r: 1, g: 0.5, b: 0}}];
    //   figma.currentPage.appendChild(rect);
    //   nodes.push(rect);
    // }
    // figma.currentPage.selection = nodes;
    // figma.viewport.scrollAndZoomIntoView(nodes);
    console.log(String(msg.count));
    const getPage = await getFromStorage(String(msg.count));
    // 조건문: FrameNode만 가지고 있는 속성 출력해서 '' 나오면 console.log('Not Frame')하고 return
    // ['ƒramenodeprops1', '2', '3'].includes() 
    const getPageNode: FrameNode = getPage[0];
    console.log(getPage[0]);
    console.log('출력', getPageNode);
    let keyskeys = await keysStorage(1);
    console.log('keys', keyskeys);
    console.log('타입', getPageNode.type);
    console.log('id 타입은 string', getPageNode.id);
    console.log('카운트', msg.count);
    // console.log(getPage[0]);  // 이게 맞다
    // console.log(getPage);
    if (getPageNode.type != 'FRAME') { 
      console.log('Not Frame');
      return 
    }
    console.log(getPageNode, 'Frame?');
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  if (msg.type === 'compare') {
    console.log('onClose 작동중');
    let keyskeys = await keysStorage();
    console.log('onClose await 성공,', keyskeys);
    for (const key of keyskeys) {
      console.log('key of keyskeys', key);
      figma.clientStorage.deleteAsync(key);
      console.log(keyskeys);
    }
    keycount = 0;
    return
  }
  
  if (msg.type === 'terminate') {
    figma.closePlugin();
  }
};

// 실험 1. cleanKeys

async function cleanKeys() {
  if (debug) { console.log('onClose 내부의 async function cleanKeys 작동중'); }
  let keysToClean = await keysStorage();
  console.log('onClose await 성공,', keysToClean);
  for (const key of keyskeys) {
    console.log('key of keyskeys', key);
    figma.clientStorage.deleteAsync(key);
    console.log(keyskeys);
  }
  keycount = 0;
  return
}

/*===== Run & Close Functions =====*/
async function onRun() {
  figma.showUI(__html__);
  let initialFrame = figma.currentPage.selection[0]
  if(debug) { console.log('initialFrame', initialFrame); }
  if (initialFrame.type != 'FRAME') { 
    console.log('선택된 항목이 프레임이 아닙니다')  // 나중에 console log 아닌 UI message로 바꾸기 (혹은 toast?)
    return 
  }
  initialFrameId = initialFrame.id; // 관찰하고자 하는 프레임의 id를 보냄
  initialFrameGlobal = initialFrame // 필요없으면 삭제
  if(debug) { 
    console.log('관찰하려는 id를 보냄', initialFrameId);
    console.log('글로벌 변수에 저장', initialFrameGlobal);
  }
}

// This is also not the place to run any asynchronous actions (e.g. register callbacks, using await, etc). 
// 따라서 storage 내부 key pair 삭제는 다른 함수에서 진행하여야 한다. 
function onClose() {
  // 20220726 실험 1. synchronous 하게 만들고 clean function을 삽입하면 되지 않을까?
  // cleanKeys();
  return
}

/*===== Using on API =====*/
figma.on('run', onRun); // Plugin이 실행되면 할 동작 정의 
figma.on('close', onClose); // Plugin이 종료되면 할 동작 정의
figma.on('selectionchange', onSelections); // Plugin이 켜진 상태에서, 유저가 선택을 변경 시 진행할 동작 정의