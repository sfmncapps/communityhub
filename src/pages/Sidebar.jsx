import {
  FaUser,
  FaHome,
  FaBriefcase,
  FaPlusCircle,
  FaList,
  FaBullhorn,
  FaUsers,
  FaSignOutAlt,
} from "react-icons/fa";

const Sidebar = ({ activePage, setActivePage }) => {
  return (
    <div className="sidebar">

      <ul className="sidebar-menu">
        <li className={activePage === "profile" ? "active" : ""} onClick={() => setActivePage("profile")}>
          <FaUser /> My Profile
        </li>

        <li className={activePage === "dashboard" ? "active" : ""} onClick={() => setActivePage("dashboard")}>
          <FaHome /> Dashboard
        </li>

        <li className={activePage === "jobs" ? "active" : ""} onClick={() => setActivePage("jobs")}>
          <FaBriefcase /> My Jobs
        </li>

        <li className={activePage === "mydirectory" ? "active" : ""} onClick={() => setActivePage("mydirectory")}>
          <FaList /> My Directory
        </li>

        <li className={activePage === "myclassifieds" ? "active" : ""} onClick={() => setActivePage("myclassifieds")}>
          <FaBullhorn /> My Classifieds
        </li>

        <li className={activePage === "mycommunity" ? "active" : ""} onClick={() => setActivePage("mycommunity")}>
          <FaUsers /> My Events
        </li>

        <li className="logout">
          <FaSignOutAlt /> Logout
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
