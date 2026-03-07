import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const createUndefinedOrNullError = () => {
    const obj: any = {}
    console.log(obj.someProperty.someNestedProperty) // This will throw a TypeError
  }

  const failfetchapicall = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/invalid-endpoint')
      if (!response.ok) {
        throw new Error(`API call failed with status ${response.status}`)
      }
      const data = await response.json()
      console.log(data)
    } catch (error) {
      console.error('Error during API call:', error)
    }
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <button onClick={failfetchapicall}>
        Click to fail an API call
      </button>
      
      <button onClick={createUndefinedOrNullError}>
        Click to create an error
      </button>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
