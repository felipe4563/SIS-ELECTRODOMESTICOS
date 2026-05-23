import React from 'react';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
      </header>
      
      <main className="dashboard-main">
        <section className="dashboard-grid">
          <div className="card">
            <h2>Total Users</h2>
            <p className="stat">1,234</p>
          </div>
          
          <div className="card">
            <h2>Revenue</h2>
            <p className="stat">$45,678</p>
          </div>
          
          <div className="card">
            <h2>Orders</h2>
            <p className="stat">567</p>
          </div>
          
          <div className="card">
            <h2>Growth</h2>
            <p className="stat">+12.5%</p>
          </div>
        </section>
        
        <section className="dashboard-content">
          <div className="widget">
            <h2>Recent Activity</h2>
            <p>No recent activity</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
