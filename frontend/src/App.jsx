import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast';
import { TextProvider } from './context/TextContext';
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import Footer from './components/Footer/Footer'
import QuizGenerator from './components/Quiz/QuizGenerator'
import QuizContainer from './components/Quiz/QuizContainer'
import { useDyslexiaMode } from './hooks/useDyslexiaMode'

function App() {
  useDyslexiaMode(); // Initialize global Dyslexia Mode

  return (
    <TextProvider>
      <Router>
        <Routes>
          <Route path='/' element={<Login />}/>
          <Route path='/register' element={<Register/>}/>
          <Route path='/home' element={<Dashboard />}/>
          <Route path='/quiz' element={<QuizGenerator />}/>
          <Route path='/quiz/take/:quizId' element={<QuizContainer />}/>
        </Routes>
        <Footer />
        <Toaster position='top-center' />
      </Router>
    </TextProvider>
  )
}

export default App
