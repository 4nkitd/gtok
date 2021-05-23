import Header from './header';
import Footer from './footer';
import db from './data'

var repo_state = 0
var repo = db[repo_state]

function Main() {

    return (
        <main>

            <Header />

            <div>

                <div className="card-gtok">
                    <div id="login-container">

                        <a target="_blank" href="{g_info('url')}" >
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

                        <button onClick={() => { repo = repo[++repo_state] }} className="btn btn-sm btn-block" > NEXT </button>

                        <footer className="p-2 pb-0 mt-4">
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


            </div>



            <Footer />

        </main>
    );
}

export default Main;
