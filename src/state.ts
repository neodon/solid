import S from 's-js';
const SNODE = Symbol('solid-node'),
  SPROXY = Symbol('solid-proxy');

function wrap(value) { return value[SPROXY] || (value[SPROXY] = new Proxy(value, proxyTraps)); }

export function isWrappable(obj) { return obj !== null && typeof obj === 'object' && (obj.__proto__ === Object.prototype || Array.isArray(obj)); }

export function unwrap(item) {
  let result, unwrapped, v;
  if ((result = (item != null) && item._state)) return result;
  if (!isWrappable(item)) return item;

  if (Array.isArray(item)) {
    if (Object.isFrozen(item)) item = item.slice(0);
    for (let i = 0, l = item.length; i < l; i++) {
      v = item[i];
      if ((unwrapped = unwrap(v)) !== v) item[i] = unwrapped;
    }
  } else {
    if (Object.isFrozen(item)) item = Object.assign({}, item);
    let keys = Object.keys(item);
    for (let i = 0, l = keys.length; i < l; i++) {
      v = item[keys[i]];
      if ((unwrapped = unwrap(v)) !== v) item[keys[i]] = unwrapped;
    }
  }
  return item;
}

function getDataNodes(target) {
  let nodes = target[SNODE];
  if (!nodes) target[SNODE] = nodes = {};
  return nodes;
}

const proxyTraps = {
  get(target, property) {
    if (property === '_state') return target;
    if (property === SPROXY || property === SNODE) return;
    const value = target[property],
      wrappable = isWrappable(value);
    if (S.isListening() && typeof value !== 'function') {
      let nodes, node;
      if (wrappable && (nodes = getDataNodes(value))) {
        node = nodes._self || (nodes._self = S.makeDataNode(undefined));
        node.current();
      }
      nodes = getDataNodes(target);
      node = nodes[property] || (nodes[property] = S.makeDataNode(undefined));
      node.current();
    }
    return wrappable ? wrap(value) : value;
  },

  set() { return true; },

  deleteProperty() { return true; }
};

export function setProperty(state, property, value) {
  value = unwrap(value);
  if (state[property] === value) return;
  const notify = Array.isArray(state) || !(property in state);
  if (value === void 0) {
    delete state[property];
  } else state[property] = value;
  let nodes = getDataNodes(state), node;
  (node = nodes[property]) && node.next();
  notify && (node = nodes._self) && node.next();
}

function mergeState(state, value) {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    setProperty(state, key, value[key]);
  }
}

function updatePath(current, path, traversed = []) {
  if (path.length === 1) {
    let value = path[0];
    if (typeof value === 'function') {
      value = value(wrap(current), traversed);
      // reconciled
      if (value === undefined) return;
    }
    mergeState(current, value);
    return;
  }

  const part = path.shift(),
    partType = typeof part,
    isArray = Array.isArray(current);

  if (Array.isArray(part)) {
    // Ex. update('data', [2, 23], 'label', l => l + ' !!!');
    for (let i = 0; i < part.length; i++) {
      updatePath(current, [part[i]].concat(path), traversed.concat([part[i]]));
    }
  } else if (isArray && partType === 'function') {
    // Ex. update('data', i => i.id === 42, 'label', l => l + ' !!!');
    for (let i = 0; i < current.length; i++) {
      if (part(current[i], i)) updatePath(current, [i].concat(path), traversed.concat([i]));
    }
  } else if (isArray && partType === 'object') {
    // Ex. update('data', { from: 3, to: 12, by: 2 }, 'label', l => l + ' !!!');
    const {from = 0, to = current.length - 1, by = 1} = part;
    for (let i = from; i <= to; i += by) {
      updatePath(current, [i].concat(path), traversed.concat([i]));
    }
  } else if (isArray && part === '*') {
    // Ex. update('data', '*', 'label', l => l + ' !!!');
    for (let i = 0; i < current.length; i++) {
      updatePath(current, [i].concat(path), traversed.concat([i]));
    }
  } else if (path.length === 1) {
    let value = path[0];
    if (typeof value === 'function') {
      const currentPart = current[part];
      value = value(isWrappable(currentPart) ? wrap(currentPart) : currentPart, traversed.concat([part]));
    }
    if (isWrappable(current[part]) && isWrappable(value) && !Array.isArray(value)) {
      mergeState(current[part], value);
    } else setProperty(current, part, value);
  } else updatePath(current[part], path, traversed.concat([part]));
}

export function createState(state = {}) {
  state = unwrap(state);
  const wrappedState = wrap(state);

  function setState() {
    const args = arguments;
    S.freeze(() => {
      if (Array.isArray(args[0])) {
        for (let i = 0; i < args.length; i += 1) {
          updatePath(state, args[i]);
        }
      } else updatePath(state, Array.prototype.slice.call(args));
    });
  }

  return [wrappedState, setState];
}
