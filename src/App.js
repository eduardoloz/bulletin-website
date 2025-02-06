import logo from './logo.svg';
import './App.css';
import Navbar from './components/navbar';
import CourseGraph from './components/GraphComponent';

function App() {
  return (
    <div className="App">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen p-10"> 
        <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-10"> 
          <CourseGraph />
         </div>   
       </div>
    </div>

  );
}

export default App;
