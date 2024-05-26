const db = require('../../config/db_wrapper');
const express = require('express')
const app = express()

const Dashboard = require('../../models/dashboard/index_model');

exports.getDashboardData = async (req, res) => {
    const dashboard = new Dashboard(db);

    const dashboardCounts = await dashboard.getDashboardCounts();
    const deviceCount = await dashboard.getDeviceCount();
    const users = await dashboard.getUsers();
    const notifications = await dashboard.getNotifications();
    
    const data = {
        deviceCount: {
            apple: parseInt(deviceCount[0].Apple ) ?? 0,
            android: parseInt(deviceCount[0].Android ) ?? 0,
            others: parseInt(deviceCount[0].Others ) ?? 0,
        },
        totalUsers:   parseInt(dashboardCounts[0].total_users) ?? 0,
        totalVideos:  parseInt(dashboardCounts[0].total_videos) ?? 0,
        totalMessages: parseInt(dashboardCounts[0].total_messages) ?? 0,
        users: users,
        notifications: notifications,
    };
    res.render('pages/index', data);
}