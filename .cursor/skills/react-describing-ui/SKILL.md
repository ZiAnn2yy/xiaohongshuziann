---
name: react-describing-ui
description: Guide React UI component development following official React patterns. Use when creating React components, writing JSX, passing props, conditional rendering, rendering lists, or structuring component trees.
---

# React 描述 UI（Describing the UI）

基于 React 官方文档的组件开发指南。当用户需要创建、组织、渲染 React 组件时，遵循以下模式。

## 组件创建

React 组件是返回 JSX 的 JavaScript 函数，名称必须大写开头：

```jsx
function Profile() {
  return <img src="avatar.jpg" alt="User" />;
}

export default function Gallery() {
  return (
    <section>
      <h1>Team</h1>
      <Profile />
      <Profile />
    </section>
  );
}
```

**关键规则**：
- 组件名大写开头（`Profile`，不是 `profile`）
- 永远不要在组件内部定义另一个组件——应在顶层声明
- 一个文件的默认导出只有一个组件，具名导出可以有多个

## 导入与导出

| 语法 | 导出 | 导入 |
|------|------|------|
| 默认 | `export default function Button() {}` | `import Button from './Button'` |
| 具名 | `export function Button() {}` | `import { Button } from './Button'` |

一个文件最多一个默认导出，可以有多个具名导出。

## JSX 规则

1. **只返回单个根元素**：多个元素用 `<div>` 或 `<>...</>` 包裹
2. **所有标签必须闭合**：`<img />`, `<br />`
3. **使用 camelCase**：`className`（不是 `class`），`onClick`（不是 `onclick`）

### 在 JSX 中使用 JavaScript

用花括号 `{}` 嵌入 JS 表达式：

```jsx
function UserCard({ user }) {
  return (
    <div style={{ backgroundColor: user.theme }}>
      <h1>{user.name}</h1>
      <img src={user.avatarUrl} alt={user.name} />
    </div>
  );
}
```

花括号使用位置：
- 标签内的文本：`<h1>{title}</h1>`
- 属性值：`src={url}`
- 双花括号传递对象：`style={{ color: 'red' }}`

## Props 传递

Props 是父组件向子组件传递数据的方式：

```jsx
// 父组件传递 props
<Avatar person={{ name: 'Lin', imageId: 'abc123' }} size={100} />

// 子组件接收 props（解构）
function Avatar({ person, size = 80 }) {
  return (
    <img
      src={getImageUrl(person)}
      alt={person.name}
      width={size}
      height={size}
    />
  );
}
```

**要点**：
- 可以设置默认值：`{ size = 80 }`
- 用 `children` 接收嵌套内容
- Props 是只读的，不要修改

### children 模式

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

// 使用
<Card>
  <Avatar />
  <p>Description</p>
</Card>
```

## 条件渲染

三种方式，按场景选择：

```jsx
// 1. if/else — 整个组件有条件
if (isPacked) {
  return <li className="item">{name} ✅</li>;
}
return <li className="item">{name}</li>;

// 2. 三元运算符 — 二选一
return <li>{isPacked ? <del>{name}</del> : name}</li>;

// 3. && 短路 — 有或无
return <li>{name} {isPacked && '✅'}</li>;
```

⚠️ `&&` 左侧不要放数字 `0`，因为 `0 && <X/>` 会渲染 `0`。

## 渲染列表

用 `map()` 转换数组，每项必须有唯一 `key`：

```jsx
function List({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
```

**Key 规则**：
- 用数据库 ID 或稳定唯一值，不要用数组索引
- Key 在兄弟节点间唯一即可
- Key 不可变，不要在渲染时生成

用 `filter()` 过滤：

```jsx
const chemists = people.filter(p => p.profession === 'chemist');
```

## 保持组件纯粹

纯组件 = 相同输入，相同输出，无副作用：

```jsx
// ❌ 不纯 — 修改外部变量
let count = 0;
function Counter() {
  count++;
  return <h2>Count: {count}</h2>;
}

// ✅ 纯 — 通过 props 传入
function Counter({ count }) {
  return <h2>Count: {count}</h2>;
}
```

**原则**：
- 不修改渲染前已存在的变量
- 相同 props → 相同 JSX
- 副作用放在事件处理函数或 `useEffect` 中

## 组件树思维

- 顶层组件（靠近根）控制数据流
- 叶子组件（无子组件）负责具体渲染
- 模块依赖树影响打包体积，保持导入关系清晰

## 更多参考

- 完整示例见 [examples.md](examples.md)
- React 官方文档：https://zh-hans.react.dev/learn/describing-the-ui
