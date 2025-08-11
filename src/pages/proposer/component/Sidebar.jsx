import React from 'react'
import { FaArrowLeft, FaLeftLong } from 'react-icons/fa6'

function Sidebar({ isToggle, setIsToggle }) {
    return (
        <>
            <div className="sb-sidenav-menu">
                <div className="nav">
                    <a className="nav-link mt-3" href="/dashboard">
                        <div className="sb-nav-link-icon"><i className="fas fa-tachometer-alt" /></div>
                        Dashboard
                    </a>



                    <a className="nav-link" href="/create-proposal">
                        <div className="sb-nav-link-icon">
                            <i className="fas fa-chart-area" />
                        </div>
                        Create Proposal
                    </a>

                    <a className="nav-link" href="/activity-log">
                        <div className="sb-nav-link-icon">
                            <i className="fas fa-history" />
                        </div>
                        Activity Log
                    </a>


                    {/* 
                    <a className="nav-link" href="">
                        <div className="sb-nav-link-icon">
                            <i className="fas fa-chart-area" />
                        </div>
                        Lock to Vote
                    </a>

                    <a className="nav-link" href="">
                        <div className="sb-nav-link-icon">
                            <i className="fas fa-chart-area" />
                        </div>
                        Optimistic
                    </a> */}
                </div>
            </div>
        </>
    )
}

export default Sidebar