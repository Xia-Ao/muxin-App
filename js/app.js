window.app = {
	// 接口服务地址
	baseUrl: 'http://e22n907181.imwork.net',

	// 图片度服务器地址
	imgUrl: 'http://35.200.14.97:88/group1/',

	// neety websocket服务地址
	nettyServerUrl: 'ws://e22n907181.imwork.net:57830/ws',

	// 判断字符串是否为空
	isNotNull: function(str) {
		if (str != null && str != "" && str != undefined) {
			return true
		}
		return false
	},
	// 弹窗提示
	showToast: function(msg, type) {
		plus.nativeUI.toast(msg, {
			icon: "image/" + type + ".png",
			verticalAlign: "center"
		})
	},

	// 保存用户的全局对象
	setUserGlobalInfo: function(user) {
		var userInfo = JSON.stringify(user);
		plus.storage.setItem('userInfo', userInfo)

	},

	// 退出登录， 移除用户对象
	loginOut: function() {
		plus.storage.removeItem('userInfo');
	},

	// 获取用户的全局对象
	getUserGlobalInfo: function() {
		var userInfo = plus.storage.getItem("userInfo")
		return JSON.parse(userInfo);
	},

	// 保存用户的联系人列表
	setContactList: function(contactList) {
		var contactListStr = JSON.stringify(contactList);
		plus.storage.setItem('contactList', contactListStr)
	},

	// 获取联系人列表
	getContactList: function() {
		var list = plus.storage.getItem('contactList');
		if (!this.isNotNull(list)) {
			return [];
		}
		return JSON.parse(list);
	},


	// 对应后端消息签收状态枚举
	CONNECT: 1, // 第一次(或重连)初始化连接
	CHAT: 2, //聊天消息
	SIGNED: 3, //消息签收
	KEEPALIVE: 4, //客户端保持心跳
	PULL_FRIEND: 5, //拉取好友

	// 和后端的 ChatMsg 聊天模型对象保持一致
	ChatMsg: function(senderId, receiverId, msg, msgId) {
		this.senderId = senderId;
		this.receiverId = receiverId;
		this.msg = msg;
		this.msgId = msgId;
	},

	// 构建消息 DataContent 模型对象
	DataContent: function(action, chatMessage, extand) {
		this.action = action;
		this.chatMessage = chatMessage;
		this.extand = extand;
	},

	// 根据用户id, 从本地的缓存中获取朋友的信息
	getFriendFromConatactList: function(friendId) {
		var listStr = plus.storage.getItem('contactList');
		// 判断是否为空
		if (this.isNotNull(listStr)) {
			var list = JSON.parse(listStr);
			for (var i = 0; i < list.length; i++) {
				var friend = list[i];
				if (friend.friendUserId == friendId) {
					return friend;
					break;
				}
			}
		} else {
			return null;
		}
	},

	// 单个聊天记录对象
	ChatHistory: function(myId, friendId, msg, flag) {
		this.myId = myId;
		this.friendId = friendId;
		this.msg = msg;
		this.flag = flag;
	},

	// 快照对象
	ChatSnapshot: function(myId, friendId, msg, isRead) {
		this.myId = myId;
		this.friendId = friendId;
		this.msg = msg;
		this.isRead = isRead;
	},

	// 保存用户聊天记录
	saveUserChatHistory: function(myId, friendId, msg, flag) {
		var that = this;
		var chatKey = 'chat' + myId + '-' + friendId;

		// 1. 先从缓存看看是否有之前的记录
		var chatHistoryListStr = plus.storage.getItem(chatKey);
		var chatHistoryList = null;
		if (chatHistoryListStr) {
			chatHistoryList = JSON.parse(chatHistoryListStr);
		} else {
			chatHistoryList = [];
		}

		// 构建聊天记录对象
		var signMsg = new that.ChatHistory(myId, friendId, msg, flag);
		// 向list中追加msg对象
		chatHistoryList.push(signMsg);
		plus.storage.setItem(chatKey, JSON.stringify(chatHistoryList));
	},

	// 获取用户聊天记录
	getUserChatHistory: function(myId, friendId) {
		var that = this;
		var chatKey = 'chat' + myId + '-' + friendId;
		var chatHistoryListStr = plus.storage.getItem(chatKey);
		var chatHistoryList;
		if (chatHistoryListStr) {
			chatHistoryList = JSON.parse(chatHistoryListStr);
		} else {
			chatHistoryList = [];
		}
		return chatHistoryList;
	},

	// 删除我和朋友的聊天记录
	deleteUserChatHistory: function(myId, friendId) {
		var chatKey = 'chat' + myId + '-' + friendId;
		plus.storage.removeItem(chatKey);
	},

	// 保存聊天记录的快照，仅仅保存每次和朋友聊天的最后一条消息
	saveUserChatSnapshot: function(myId, friendId, msg, isRead) {
		var that = this;
		var chatKey = 'chat-snapshot' + myId;
		var chatSnapshotListStr = plus.storage.getItem(chatKey);
		var chatSnapshotList = null;

		if (chatSnapshotListStr) {
			chatSnapshotList = JSON.parse(chatSnapshotListStr);
			// 循环快照list，并且判断每个元素是否包含（匹配）friendId，如果匹配，则删除
			for (var i = 0; i < chatSnapshotList.length; i++) {
				if (chatSnapshotList[i].friendId == friendId) {
					// 删除已存在的friendId对应的快照对象
					chatSnapshotList.splice(i, 1);
					break;
				}
			}
		} else {
			chatSnapshotList = [];
		}

		// 构建聊天快照对象
		var singleMsg = new that.ChatSnapshot(myId, friendId, msg, isRead);

		// 向list中追加快照对象
		chatSnapshotList.unshift(singleMsg);

		plus.storage.setItem(chatKey, JSON.stringify(chatSnapshotList));
	},

	/**
	 * 获取用户快照记录列表
	 */
	getUserChatSnapshot: function(myId) {
		var that = this;
		var chatKey = "chat-snapshot" + myId;
		// 从本地缓存获取聊天快照的list
		var chatSnapshotListStr = plus.storage.getItem(chatKey);
		var chatSnapshotList;
		if (that.isNotNull(chatSnapshotListStr)) {
			// 如果不为空
			chatSnapshotList = JSON.parse(chatSnapshotListStr);
		} else {
			// 如果为空，赋一个空的list
			chatSnapshotList = [];
		}

		return chatSnapshotList;
	},

	/**
	 * 删除本地的聊天快照记录
	 */
	deleteUserChatSnapshot: function(myId, friendId) {
		var that = this;
		var chatKey = "chat-snapshot" + myId;

		// 从本地缓存获取聊天快照的list
		var chatSnapshotListStr = plus.storage.getItem(chatKey);
		var chatSnapshotList;
		if (that.isNotNull(chatSnapshotListStr)) {
			// 如果不为空
			chatSnapshotList = JSON.parse(chatSnapshotListStr);
			// 循环快照list，并且判断每个元素是否包含（匹配）friendId，如果匹配，则删除
			for (var i = 0; i < chatSnapshotList.length; i++) {
				if (chatSnapshotList[i].friendId == friendId) {
					// 删除已经存在的friendId所对应的快照对象
					chatSnapshotList.splice(i, 1);
					break;
				}
			}
		} else {
			// 如果为空，不做处理
			return;
		}

		plus.storage.setItem(chatKey, JSON.stringify(chatSnapshotList));
	},

	// 标记未读消息为已读状态
	readUserChatSnapshot: function(myId, friendId) {
		var that = this;
		var chatKey = "chat-snapshot" + myId;

		// 从本地缓存获取聊天快照的list
		var chatSnapshotListStr = plus.storage.getItem(chatKey);
		var chatSnapshotList;
		if (that.isNotNull(chatSnapshotListStr)) {
			// 如果不为空
			chatSnapshotList = JSON.parse(chatSnapshotListStr);
			// 循环快照list，并且判断每个元素是否包含（匹配）friendId，如果匹配，则删除
			for (var i in chatSnapshotList) {
				var item = chatSnapshotList[i];
				if (item.friendId == friendId) {
					item.isRead = true;
					// 删除已经存在的friendId所对应的快照对象
					chatSnapshotList.splice(i, 1, item);
					break;
				}
			}

			// 替换原有的快照
			plus.storage.setItem(chatKey, JSON.stringify(chatSnapshotList));
		} else {
			// 如果为空，不做处理
			return;
		}
	},


}
