import Header from './header';
import Footer from './footer';

function Main() {
    return (
        <main>

            <Header />

            <div ClassName="card">
                <div id="login-container">
                    <div ClassName="profile-img"></div>
                    <h1>User</h1>
                    <h2>my-repo</h2>
                    <div ClassName="description">
                        this is a dummy description of the repo.
                    </div>
                    
                    <div ClassName="social">
                        <p>GitHub</p>
                    </div>

                    <footer>
                        <div ClassName="likes">
                            <p>Stars</p>
                            <p>1.5K</p>
                        </div>
                        <div ClassName="projects">
                            <p>Forks</p>
                            <p>154</p>
                        </div>
                    </footer>
                </div>
            </div>

            <Footer />

        </main>
    );
}

export default Main;
