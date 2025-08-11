import React from 'react'

function Footer() {
  return (
    <>
      <footer className="bg-dark text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <img src="assets/image/logo/logo-desktop.png" width={120} alt="Ganjes DAO" className="me-3" />
                <div>
                  <small>© 2024 Ganjes DAO. All rights reserved.</small>
                  <br />
                  <small className="text-muted">Empowering the future of decentralized funding</small>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="d-flex justify-content-md-end justify-content-center gap-3 mt-3 mt-md-0">
                <a href="#" className="text-white">
                  <i className="fab fa-twitter fa-lg"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-discord fa-lg"></i>
                </a>
                <a href="#" className="text-white">
                  <i className="fab fa-github fa-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer