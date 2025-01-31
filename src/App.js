import logo from './logo.svg';
import './App.css';
import Navbar from './components/navbar';
import CourseGraph from './components/GraphComponent';

function App() {
  return (
    <div className="App">
      <Navbar />
      <CourseGraph />
    </div>
  );
}

export default App;
