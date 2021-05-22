import Header from './header';
import Footer from './footer';
import TinderCard from 'react-tinder-card'
import db from './data'

const onSwipe = (direction) => {
    console.log('You swiped: ' + direction)
}

const onCardLeftScreen = (myIdentifier) => {
    console.log(myIdentifier + ' left the screen')
}


function Main() {

    const git_repo = db

    return (
        <main>

            <Header />

            {
                git_repo.map((repo) =>
                <TinderCard
                    onSwipe={onSwipe}
                    onCardLeftScreen={() => onCardLeftScreen('fooBar')}
                    preventSwipe={['right', 'left', 'bottom']}
                >

                    <div className="card-gtok">
                        <div id="login-container">

                            <a target="_blank" href="{repo.url}" >
                                <div className="profile-img"></div>
                            </a>

                            <div className="col-12">
                                    <h4 className="col-10 float-right text-right border-bottom" >
                                        <a target="_blank" href="{repo.url}" > {repo.username} </a>
                                    </h4>
                                    <h3 className="col-12 text-right">{repo.name}</h3>
                            </div>

                            <div className="description col-12 card">
                                {repo.description}
                            </div>

                            <footer className="p-2 pb-0">
                                <div className="likes">
                                    <p className="mb-0" >Stars</p>
                                    <p className="mb-0" >{repo.stars}</p>
                                </div>
                                <div className="projects">
                                    <p className="mb-0">Forks</p>
                                    <p className="mb-0">{repo.forks}</p>
                                </div>
                            </footer>
                        </div>
                    </div>

                </TinderCard>

                )}


            <Footer />

        </main>
    );
}

export default Main;
