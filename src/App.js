import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import AssetList from './components/AssetList';
import BoardList from './components/BoardList';
import PostDetail from './components/PostDetail';
import PostWrite from './components/PostWrite';
import Login from './components/Login';
import Register from './components/Register';
import Notifications from './components/Notifications';
import AssetDetail from './components/AssetDetail';
import User from './components/User';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App bg-dark min-vh-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/:assetId" element={<AssetDetail />} />
          <Route path="/assets/:assetId/posts" element={<BoardList />} />
          <Route path="/users/:user" element={<User />} />
          <Route path="/assets/:assetId/posts/write" element={<PostWrite />} />
          <Route path="/assets/:assetId/posts/:postId" element={<PostDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
