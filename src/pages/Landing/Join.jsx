import React, { useState } from 'react';
import axios from 'axios';

function Join() {

    return (
        <>
            <div className="container-fluid">
                <div className="card-body">
                    <div className="mt-5">
                        <div className="row mt-5 ">
                            <div className="col-12 text-center">
                                <img src="assets/image/logo/light-logo.png" loading="lazy" alt="Logo" width={400} />
                                <div className="mt-5">
                                    <h1 style={{ color: "#064f3c", }}>Revolutionizing Funding in the Cannabis and Psychedelic Industries.</h1>
                                </div>
                                <div className="mt-5">
                                    <div className="container d-flex justify-content-center align-items-center">
                                        <div className="col-lg-10">
                                            <span style={{ color: "#047857" }}> GANJES is revolutionizing funding in the cannabis and psychedelics industries through a unique dual investment model that combines a traditional investment fund with a decentralized platform. Our mission is to empower growth in these sectors by providing innovative funding solutions and creating a decentralized investment ecosystem.</span>
                                            <div className="row mt-5">
                                                <div className="col-md-6 col-12 col-xl-6 mt-5">
                                                    <div className="card card-body">
                                                        <div className="row">
                                                            <div className="col-12 col-md-7 col-xl-7">
                                                                <div className="text-start mt-1">
                                                                    <h4>Join Us</h4>
                                                                    <h1>Investor</h1>
                                                                    <div className="mt-2">
                                                                        <span>Discover high-potential startups, diversify your portfolio, and fuel the next wave of innovation.</span>
                                                                    </div>
                                                                    <div className="mt-2">
                                                                        <a href="/investor-register" className="btn btn-success w-100">
                                                                            Join Now
                                                                        </a>
                                                                    </div>

                                                                </div>
                                                            </div>
                                                            <div className="col-12 col-md-5 col-xl-5">
                                                                <img src="assets/image/Landing/investor.png" className="w-100 h-auto" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                                <div className="col-md-6 col-12 col-xl-6 mt-5">
                                                    <div className="card card-body">
                                                        <div className="row">
                                                             <div className="col-12 col-md-5 col-xl-5">
                                                                <img src="assets/image/Landing/proposer.png" className="w-100 h-auto" />
                                                            </div>
                                                            <div className="col-12 col-md-7 col-xl-7">
                                                                <div className="text-start mt-1">
                                                                    <h4>Join Us</h4>
                                                                    <h1>Startup</h1>
                                                                    <div className="mt-2">
                                                                        <span>Connect with the right investors, gain valuable insights, and accelerate your growth journey.</span>
                                                                    </div>
                                                                    <div className="mt-2">
                                                                        <a href="/register" className="btn btn-success w-100">
                                                                            Join Now
                                                                        </a>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>

                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Join