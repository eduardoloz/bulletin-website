import catImg from '../data/catImg.jpg';

function CatPage() {
  return (
    <div className="cat-page">

      <img src={catImg} alt="Cat" />
    </div>
  );
}

export default CatPage;