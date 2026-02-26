# React 描述 UI — 完整示例

## 示例 1：多组件组合页面

```jsx
import { getImageUrl } from './utils';

function Avatar({ person, size = 80 }) {
  return (
    <img
      className="avatar"
      src={getImageUrl(person)}
      alt={person.name}
      width={size}
      height={size}
    />
  );
}

function Card({ children }) {
  return <div className="card">{children}</div>;
}

export default function Profile() {
  return (
    <Card>
      <Avatar
        person={{ name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }}
        size={100}
      />
    </Card>
  );
}
```

## 示例 2：条件渲染 — 打包清单

```jsx
function Item({ name, isPacked }) {
  return (
    <li className="item">
      {isPacked ? <del>{name} ✅</del> : name}
    </li>
  );
}

export default function PackingList() {
  return (
    <section>
      <h1>Packing List</h1>
      <ul>
        <Item isPacked={true} name="Space suit" />
        <Item isPacked={true} name="Helmet" />
        <Item isPacked={false} name="Photo" />
      </ul>
    </section>
  );
}
```

## 示例 3：列表渲染 + 过滤

```jsx
const people = [
  { id: 0, name: 'Creola Katherine Johnson', profession: 'mathematician' },
  { id: 1, name: 'Mario José Molina', profession: 'chemist' },
  { id: 2, name: 'Mohammad Abdus Salam', profession: 'physicist' },
  { id: 3, name: 'Percy Lavon Julian', profession: 'chemist' },
];

export default function ScientistList() {
  const chemists = people.filter(p => p.profession === 'chemist');

  return (
    <article>
      <h1>Chemists</h1>
      <ul>
        {chemists.map(person => (
          <li key={person.id}>
            <b>{person.name}</b> — {person.profession}
          </li>
        ))}
      </ul>
    </article>
  );
}
```

## 示例 4：纯组件 vs 非纯组件

```jsx
// ❌ 非纯组件 — 每次渲染修改外部变量
let guest = 0;
function Cup() {
  guest = guest + 1;
  return <h2>Tea cup for guest #{guest}</h2>;
}

// ✅ 纯组件 — 通过 props 传入数据
function Cup({ guest }) {
  return <h2>Tea cup for guest #{guest}</h2>;
}

export default function TeaSet() {
  return (
    <>
      <Cup guest={1} />
      <Cup guest={2} />
      <Cup guest={3} />
    </>
  );
}
```

## 示例 5：JSX 中嵌入 JavaScript 表达式

```jsx
const person = {
  name: 'Gregorio Y. Zara',
  theme: {
    backgroundColor: 'black',
    color: 'pink',
  },
};

export default function TodoList() {
  return (
    <div style={person.theme}>
      <h1>{person.name}'s Todos</h1>
      <ul>
        <li>Improve the videophone</li>
        <li>Prepare aeronautics lectures</li>
        <li>Work on the alcohol-fuelled engine</li>
      </ul>
    </div>
  );
}
```
