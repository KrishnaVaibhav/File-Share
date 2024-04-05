import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RegistrationForm from './views/registrationform';
import Profile from './views/home';
import Notification from './views/notification';

function App() {
  return (
    <Router>
    <Routes>
        <Route path="/" element={<RegistrationForm />} />
        <Route path="/home" element={<Profile />} />
        <Route path="/notification" element={<Notification />} />
    </Routes>
</Router>
  );
}

export default App;