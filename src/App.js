import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegistrationForm from './views/registrationform';
import Profile from './views/home';

function App() {
  return (
    <Router>
    <Routes>
        <Route path="/" element={<RegistrationForm />} />
        <Route path="/home" element={<Profile />} />
    </Routes>
</Router>
  );
}

export default App;