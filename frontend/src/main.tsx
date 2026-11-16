import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TeamsMock } from './components/TeamsMock';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash === '#teams' ? <TeamsMock /> : <App />}
  </StrictMode>,
);
