
function Header() {
    return (
        <header>
            <div ClassName="nav">
                <input type="checkbox" id="nav-check" />
                <div ClassName="nav-header">
                    <div ClassName="nav-title">
                        G-tok
                    </div>
                </div>
                <div ClassName="nav-btn">
                    <label for="nav-check">
                        <span></span>
                        <span></span>
                        <span></span>
                    </label>
                </div>

                <div ClassName="nav-links">
                    <a href="#" >Menu 1</a>
                </div>
            </div>
        </header>
    );
}

export default Header;
