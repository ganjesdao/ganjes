import React from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaLeftLong } from 'react-icons/fa6'

function Sidebar({ isToggle, setIsToggle }) {
    return (
        <>
            <div className="sb-sidenav-menu">
                <div className="nav">
                    <Link className="nav-link mt-3 text-white" to="/investor-dashboard">
                        <div className="sb-nav-link-icon text-white"><i className="fas fa-tachometer-alt " /></div>
                        Dashboard
                    </Link>


                    <Link className="nav-link text-white" to="/investor-voting-data">
                        <div className="sb-nav-link-icon text-white">
                            <i className="fas fa-chart-area" />
                        </div>
                        My Voting
                    </Link>

                    <Link className="nav-link text-white" to="/investor-activity-log">
                        <div className="sb-nav-link-icon text-white">
                            <i className="fas fa-history" />
                        </div>
                        Activity Log
                    </Link>

                    <Link className="nav-link text-white" to="/investor-settings">
                        <div className="sb-nav-link-icon text-white">
                            <i className="fas fa-cog" />
                        </div>
                        Settings
                    </Link>


                </div>
            </div>
        </>
    )
}

export default Sidebar