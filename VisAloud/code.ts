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

let initialFrameId: String;
let initialFrameGlobal: FrameNode;
let keycount = 0; // key에 들어갈 값 
let frame_store_page: PageNode;
let clonedFrameX;
let frameWidth;
let prevFrameString: String = null;


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
  const blacklist = ['parent', 'children', 'removed', 'fillGeometry'];
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
	// if (node.masterComponent) obj.masterComponent = nodeToObject(node.masterComponent);
	return obj;
}

const nodeToObjectWithoutId = (node) => {
  const props = Object.entries(Object.getOwnPropertyDescriptors(node.__proto__));
  const blacklist = ['parent', 'children', 'removed', 'fillGeometry'];
  let obj: any = { type: node.type, children: undefined };
	if (node.parent) obj.parent = { type: node.type };
  for (const [name, prop] of props) {
    if (prop.get && blacklist.indexOf(name) < 0){
      obj[name] = prop.get.call(node);
      // if (typeof obj[name] === 'symbol') obj[name] = 'Mixed';
    }
  }
  // children traverse
	if (node.children) obj.children = node.children.map(child => nodeToObjectWithoutId(child));
	// if (node.masterComponent) obj.masterComponent = nodeToObject(node.masterComponent);
	return obj;
}


/*===== Helper functions for PageNode =====*/
function findChildByName(name, parent = figma.root) {
  return parent.findChild((node) => node.name === name);
}

function focusToPageOnRun(name) {
  figma.currentPage = findChildByName(name);
  // console.log(figma.currentPage);
  let temp = figma.createFrame();
  figma.currentPage.appendChild(temp);
  // console.log(figma.currentPage, figma.currentPage.children);
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
}

function focusToPage(name) {
  figma.currentPage = findChildByName(name);
  console.log('now focused on page ', figma.currentPage.name);
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
}

function changeCurrentPage(name) {
  figma.currentPage = findChildByName(name);
}

function cloneInPage(pageName: String, node: SceneNode) {
  changeCurrentPage(pageName);
  let clonedNode = node.clone();
  console.log('Node cloned: ', clonedNode);
  clonedNode.x = keycount * ( clonedNode.width + 50 )
  console.log(clonedNode.x, keycount);
  let originalName = clonedNode.name;
  clonedNode.name = clonedNode.name + ' ' + keycount;
  console.log(clonedNode.name);
  // prevFrameString = JSON.stringify(clonedNode);
  // console.log('prevFrameString = JSON.stringify(clonedNode): ', prevFrameString);
  // console.log('with NodeToObject: ', JSON.stringify(nodeToObjectWithoutId(clonedNode)));
}


/*===== UI methods =====*/
figma.ui.onmessage = async msg => {
  if (debug) { console.log('msg', msg); }
  if (msg.type === 'search') {
    console.log(String(msg.count));
    const getPage = await getFromStorage(String(msg.count));
    // 조건문: FrameNode만 가지고 있는 속성 출력해서 '' 나오면 console.log('Not Frame')하고 return
    // ['ƒramenodeprops1', '2', '3'].includes() 
    const getPageNode: FrameNode = getPage[0];
    console.log(getPage[0]);
    console.log('출력', getPageNode);
    let keyskeys = await keysStorage();
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

  if (msg.type === 'compare') {
    return
  }
  
  if (msg.type === 'clean') {
    let keysToClean = await keysStorage();
    if (debug) { console.log('inside clean, keysToClean:', keysToClean); }
    for (const key of keysToClean) {
      if(debug) { console.log('key (', key, ') of keysToClean'); }
      figma.clientStorage.deleteAsync(key);
      if(debug) { console.log(key, 'deleted in', keysToClean); }
    }
    keycount = 0;
    return
  }
  
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  if (msg.type === 'terminate') {
    figma.closePlugin();
  }
};

/*===== Storage Functions =====*/
	const saveToStorage = async (key, data) => {
    try {
			await figma.clientStorage.setAsync(key, JSON.stringify(data));
      if (debug) {
        console.log('inside saveToStorage');
        console.log('저장되는 raw data: ', data, '타입: ', data.type);
        console.log('stringify되어 저장되었습니다: ', JSON.stringify(data));
      }
    } catch (err) {
      console.log('while saving to storage catch:', err);
      // showNotification('warning', 'reject'); 
    }
	};

	const getFromStorage = async key => {
    try {
			const data = await figma.clientStorage.getAsync(key);
      let parsedData = JSON.parse(data);
      if (debug) {
        console.log('inside getFromStorage');
        console.log('key (', key, ') 로부터 반환된 데이터: ', data);
        console.log('해당 데이터의 타입은 (', data.type, ') 입니다.');
        console.log('이는 parse 되어 (', parsedData.type, ') 타입의 ', parsedData);
      }
			return parsedData;
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


/*===== Actions on selections =====*/

async function onSelections() {
  keycount++;
  // 선택이 작업 페이지에서 이루어지고 있는지 확인
  if (figma.currentPage.id !== figma.root.children[0].id) { console.log('작업 페이지에서 작업해 주세요'); }
  // initialFrame 선택하여 selection의 상황에 따라 사용
  let initialFrameSelection: SceneNode;
  initialFrameSelection = figma.currentPage.findAll(n => n.id === initialFrameId)[0]
  if(initialFrameSelection.type != 'FRAME') {
    console.log('initialFrameSelection is not frame but', initialFrameSelection.type);
    return
  }
  if (debug) { console.log(initialFrameSelection, 'is Frame') };
  // console.log('JSON.stringify(initialFrameSelection): ', JSON.stringify(initialFrameSelection));
  // console.log('with NodeToObject: ', JSON.stringify(nodeToObjectWithoutId(initialFrameSelection)));
  // console.log('prevFrameString: ', prevFrameString);
  // if (prevFrameString === JSON.stringify(initialFrameSelection)) {
  //   console.log('변경점이 없습니다');
  //   return
  // }
  saveToStorage(String(keycount), initialFrameSelection); // currentPage? or should we print this in another page?
  if(debug) { console.log('saved with keycount (', keycount, ')') };
  /*===== 20220728 version: =====*/
  // clone initialFrameSelection into the Frame_store page
  cloneInPage('frame_store', initialFrameSelection);
  changeCurrentPage('Wireframing in Figma');
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
  // createPage frame_store
  frame_store_page = figma.createPage(); // const?
  frame_store_page.name = 'frame_store';
  // let baseFrame
  // changeCurrentPage('frame_store');
}

// This is also not the place to run any asynchronous actions (e.g. register callbacks, using await, etc). 
// 따라서 storage 내부 key pair 삭제는 다른 함수에서 진행하여야 한다. 
function onClose() {
  // 나갈때 deletePage
  frame_store_page.remove();
  return
}

/*===== Using on API =====*/
figma.on('run', onRun); // Plugin이 실행되면 할 동작 정의 
figma.on('close', onClose); // Plugin이 종료되면 할 동작 정의
figma.on('selectionchange', onSelections); // Plugin이 켜진 상태에서, 유저가 선택을 변경 시 진행할 동작 정의