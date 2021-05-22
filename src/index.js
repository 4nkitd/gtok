import React from 'react';
import ReactDOM from 'react-dom';
import './assets/main.css';
import Main from './components/main';

ReactDOM.render(
  <React.StrictMode>
    <div className="bg-theme">
      <Main/>
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);

