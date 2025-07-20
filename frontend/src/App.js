import React, { useState, useEffect } from 'react';

function App() {
  const [response, setResponse] = useState('');

  useEffect(() => {
    fetch('/api/test')
      .then(response => response.json())
      .then(result => setResponse(result))
  }, [])

  return (
    <div>
      {response ? <p>{response.message}</p> : <p>Loading...</p>}
    </div>
  );
}

export default App;