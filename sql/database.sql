-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 18, 2023 at 12:53 PM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.1.12

START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tiktok_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE IF NOT EXISTS `admins` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `username` text NOT NULL,
  `password` text NOT NULL,
  `power` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1 = super power, 0 = demo',
  `user_id` int(11) DEFAULT 0,
  `admin_auth` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`, `power`, `user_id`, `admin_auth`) VALUES
(1, 'admin', 'ismail.admin', 2, 0, 'xyz');

-- --------------------------------------------------------

--
-- Table structure for table `ads`
--

CREATE TABLE IF NOT EXISTS `ads` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `page` varchar(255) NOT NULL,
  `pageId` tinyint(4) NOT NULL COMMENT '1 = Discover, 2 = Home page, 3 = Search, 4= Profile',
  `network` varchar(255) NOT NULL,
  `sequence` int(11) DEFAULT NULL,
  `status` tinyint(4) DEFAULT 0,
  `type` tinyint(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ad_viewed`
--
CREATE TABLE IF NOT EXISTS `ad_viewed` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `video_id` int(11) DEFAULT 0,
  `ad_id` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Table structure for table `automated_messages`
--

CREATE TABLE IF NOT EXISTS `automated_messages` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `message` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE IF NOT EXISTS `banners` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `imageUrl` text NOT NULL,
  `link` text DEFAULT NULL,
  `title` text DEFAULT NULL,
  `active` tinyint(4) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blocked_users`
--

CREATE TABLE IF NOT EXISTS `blocked_users` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `blocked_by` int(11) NOT NULL,
  `blocked_id` int(11) NOT NULL,
  `unique_id` varchar(255) DEFAULT NULL,
  `create_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookmark`
--

CREATE TABLE IF NOT EXISTS `bookmark` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL,
  `comment` varchar(255) NOT NULL,
  `likes` int(11) DEFAULT 0,
  `replies` int(11) DEFAULT 0,
  `parentId` int(11) DEFAULT 0,
  `commentTime` bigint(20) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comment_likes`
--

CREATE TABLE IF NOT EXISTS `comment_likes` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `comment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `config`
-- 

CREATE TABLE IF NOT EXISTS `config` (
  `name` varchar(50) NOT NULL PRIMARY KEY,
  `value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `config`
-- 

INSERT INTO `config` (`name`, `value`) VALUES
('accessible_address', ''),
('accessible_address_port', '3004'),
('admobAppId', ''),
('admobBannerId', ''),
('admobEnabled', 'enabled'),
('admobInterId', ''),
('admobNativeId', ''),
('app_id', 'd0ad9bc9081fba7902df195fc00237785ff2408ffdc3719664ba82918c523311'),
('app_logo', 'http://192.168.0.116:3004/uploads/appIcon/1683540058076-839281459.png'),
('app_name', 'Tikshot'),
('package_name_android', 'com.vativeapps.tikshot'),
('package_name_ios', 'com.vativeapps.tikshot'),
('service_url', 'https://64.226.98.224'),
('socket_url', 'https://64.226.98.224'),
('upload_host', ''),
('upload_path', '');

-- --------------------------------------------------------

--
-- Table structure for table `followers`
-- 

CREATE TABLE IF NOT EXISTS `followers` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `follower` int(11) NOT NULL,
  `following` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE IF NOT EXISTS `likes` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `sentTime` bigint(20) NOT NULL,
  `deliveredTime` bigint(20) DEFAULT 0,
  `seenTime` bigint(20) DEFAULT 0,
  `ack` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `receiverId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `notificationMessage` varchar(500) NOT NULL,
  `notificationTime` bigint(20) NOT NULL,
  `videoId` int(11) DEFAULT NULL,
  `streamId` int(11) DEFAULT NULL,
  `postId` int(11) DEFAULT NULL,
  `commentId` int(11) DEFAULT NULL,
  `notificationType` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookmarked_products`
--

CREATE TABLE `bookmarked_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_products`
--

CREATE TABLE `order_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` varchar(255) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_pictures`
--

CREATE TABLE `product_pictures` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE IF NOT EXISTS `reports` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `video_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `unique_id` varchar(255) DEFAULT NULL,
  `report_reason` int(11) NOT NULL,
  `status` tinyint(4) DEFAULT 0 COMMENT '0 = open, 1 = closed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `report_reasons`
--

CREATE TABLE IF NOT EXISTS `report_reasons` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `reason` varchar(255) NOT NULL,
  `points` text NOT NULL,
  `create_time` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_users`
--

CREATE TABLE IF NOT EXISTS `report_users` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `report_user_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `unique_id` varchar(255) DEFAULT NULL,
  `report_reason` int(11) NOT NULL,
  `status` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sounds`
--

CREATE TABLE IF NOT EXISTS `sounds` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `soundUrl` text NOT NULL,
  `soundPath` text NOT NULL,
  `albumPhotoUrl` text DEFAULT NULL,
  `videos` int(11) DEFAULT 0,
  `icon` text DEFAULT NULL,
  `duration` int(11) DEFAULT 0,
  `artist` varchar(255) NOT NULL,
  `admin` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sound_categories`
--

CREATE TABLE IF NOT EXISTS `sound_categories` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `picture` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sound_favorites`
--

CREATE TABLE IF NOT EXISTS `sound_favorites` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `sound_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE IF NOT EXISTS `tags` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `tag` varchar(50) NOT NULL UNIQUE,
  `views` int(11) DEFAULT 0,
  `totalVideos` int(11) DEFAULT 0,
  `banner` text DEFAULT NULL,
  `priority` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `email` text DEFAULT NULL,
  `phone` text DEFAULT NULL,
  `profilePicture` text DEFAULT NULL,
  `profilePictureBase64` text DEFAULT NULL,
  `about` varchar(255) DEFAULT NULL,
  `auth` text NOT NULL,
  `token` text DEFAULT NULL,
  `appVersion` varchar(255) NOT NULL,
  `phoneModel` varchar(255) NOT NULL,
  `country` varchar(255) DEFAULT NULL,
  `isVerified` tinyint(4) DEFAULT 0,
  `provider` tinyint(4) NOT NULL,
  `totalVideos` int(11) DEFAULT 0,
  `totalViews` int(11) DEFAULT 0,
  `totalFollowers` int(11) DEFAULT 0,
  `totalFollowings` int(11) DEFAULT 0,
  `totalLikes` int(11) DEFAULT 0,
  `totalLiked` int(11) DEFAULT 0,
  `isPrivateLikes` tinyint(4) DEFAULT 0,
  `instagram` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `twitter` varchar(255) DEFAULT NULL,
  `gems` int(11) DEFAULT 0,
  `createTime` bigint(20) DEFAULT NULL,
  `uid` text NOT NULL,
  `refferal_code` varchar(255) DEFAULT NULL,
  `levelXP` int(11) DEFAULT 0,
  `coins` int(11) DEFAULT 0,
  `totalGifts` int(11) DEFAULT 0 NULL,
  `credit` int(11) DEFAULT 0 NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `videos`
--

CREATE TABLE IF NOT EXISTS `videos` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `videoUrl` text DEFAULT NULL,
  `videoGifUrl` text DEFAULT NULL,
  `videoGifPath` text DEFAULT NULL,
  `videoTime` bigint(20) NOT NULL,
  `likes` int(11) DEFAULT 0,
  `views` int(11) DEFAULT 0,
  `comments` int(11) DEFAULT 0,
  `soundId` int(11) DEFAULT 0,
  `rewards` int(11) DEFAULT 0,
  `allowComments` tinyint(4) DEFAULT 0,
  `allowSharing` tinyint(4) DEFAULT 0,
  `allowDuet` tinyint(4) DEFAULT 0,
  `isPrivate` tinyint(4) DEFAULT 0,
  `thumbnailUrl` text DEFAULT NULL,
  `receiveGifts` tinyint(4) DEFAULT 0,
  `isExclusive` tinyint(4) DEFAULT 0,
  `exclusiveAmount` int(11) DEFAULT 0,
  `ad_id` int(11) DEFAULT 0,
  `height` varchar(255) DEFAULT NULL,
  `width` varchar(255) DEFAULT NULL,
  `isAdult` int(11) DEFAULT 0,
  `web_share_link` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `video_tags` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `video_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- Index on videos table
CREATE INDEX idx_videos_id ON videos (id);
CREATE INDEX idx_videos_user_id ON videos (user_id);
CREATE INDEX idx_videos_comments_likes_views_videoTime ON videos (comments, likes, views, videoTime);

-- Index on ad_viewed table
CREATE INDEX idx_ad_viewed_video_id ON ad_viewed (video_id);

-- Index on likes table
CREATE INDEX idx_likes_video_id ON likes (video_id);

-- Index on purchased_content table
CREATE INDEX idx_purchased_content_user_id_video_id ON purchased_content (user_id, video_id);

-- Index on followers table
CREATE INDEX idx_followers_follower_following ON followers (follower, following);