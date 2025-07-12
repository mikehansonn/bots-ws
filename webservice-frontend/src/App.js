import AuthPage from './pages/Login'; // or wherever you save this component
import Dashboard from './pages/Dashboard';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
     <Router>
        <Routes>
          <Route path="/dashboard/" element={<Dashboard />} />
          <Route path="/login/" element={<AuthPage />} />
        </Routes>
      </Router>
  );
}

export default App;
