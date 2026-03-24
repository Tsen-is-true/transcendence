import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/friends - Get friends list and pending requests
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get accepted friends (bidirectional)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get pending requests sent by current user
    const sentRequests = await prisma.friendship.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get pending requests received by current user
    const receivedRequests = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Format friends list (get the other user in the friendship)
    const friends = friendships.map((friendship) => {
      const friend = friendship.userId === userId ? friendship.friend : friendship.user;
      return {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar,
        friendshipId: friendship.id,
        status: 'accepted',
      };
    });

    // Format sent requests
    const sent = sentRequests.map((request) => ({
      id: request.friend.id,
      username: request.friend.username,
      avatar: request.friend.avatar,
      friendshipId: request.id,
      status: 'pending',
      type: 'sent',
    }));

    // Format received requests
    const received = receivedRequests.map((request) => ({
      id: request.user.id,
      username: request.user.username,
      avatar: request.user.avatar,
      friendshipId: request.id,
      status: 'pending',
      type: 'received',
    }));

    res.json({
      success: true,
      friends,
      requests: {
        sent,
        received,
      },
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      error: 'Failed to fetch friends',
    });
  }
});

// POST /api/friends/:userId - Send friend request
router.post('/:userId', async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { userId: targetUserId } = req.params;

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, avatar: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Can't friend yourself
    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: 'Cannot send friend request to yourself',
      });
    }

    // Check if friendship already exists (either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({
          error: 'Already friends',
        });
      } else if (existingFriendship.status === 'pending') {
        // If there's a pending request from the other user, accept it automatically
        if (existingFriendship.userId === targetUserId && existingFriendship.friendId === currentUserId) {
          const updated = await prisma.friendship.update({
            where: { id: existingFriendship.id },
            data: { status: 'accepted' },
          });

          return res.json({
            success: true,
            message: 'Friend request accepted',
            friendship: {
              id: targetUser.id,
              username: targetUser.username,
              avatar: targetUser.avatar,
              friendshipId: updated.id,
              status: 'accepted',
            },
          });
        } else {
          return res.status(400).json({
            error: 'Friend request already sent',
          });
        }
      } else if (existingFriendship.status === 'blocked') {
        return res.status(400).json({
          error: 'Cannot send friend request',
        });
      }
    }

    // Create new friend request
    const friendship = await prisma.friendship.create({
      data: {
        userId: currentUserId,
        friendId: targetUserId,
        status: 'pending',
      },
    });

    res.json({
      success: true,
      message: 'Friend request sent',
      friendship: {
        id: targetUser.id,
        username: targetUser.username,
        avatar: targetUser.avatar,
        friendshipId: friendship.id,
        status: 'pending',
        type: 'sent',
      },
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      error: 'Failed to send friend request',
    });
  }
});

// PUT /api/friends/:userId/accept - Accept friend request
router.put('/:userId/accept', async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { userId: targetUserId } = req.params;

    // Find pending request from target user to current user
    const friendship = await prisma.friendship.findFirst({
      where: {
        userId: targetUserId,
        friendId: currentUserId,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!friendship) {
      return res.status(404).json({
        error: 'Friend request not found',
      });
    }

    // Accept the request
    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'accepted' },
    });

    res.json({
      success: true,
      message: 'Friend request accepted',
      friendship: {
        id: friendship.user.id,
        username: friendship.user.username,
        avatar: friendship.user.avatar,
        friendshipId: updated.id,
        status: 'accepted',
      },
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      error: 'Failed to accept friend request',
    });
  }
});

// DELETE /api/friends/:userId - Remove friend or reject/cancel request
router.delete('/:userId', async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { userId: targetUserId } = req.params;

    // Find friendship (either direction)
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: targetUserId },
          { userId: targetUserId, friendId: currentUserId },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({
        error: 'Friendship not found',
      });
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    const action = friendship.status === 'accepted' ? 'Friend removed' : 'Friend request cancelled';

    res.json({
      success: true,
      message: action,
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      error: 'Failed to remove friend',
    });
  }
});

// GET /api/friends/search?q=username - Search for users to add as friends
router.get('/search', async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters',
      });
    }

    // Search for users by username
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q.trim(),
        },
        NOT: {
          id: currentUserId, // Exclude current user
        },
      },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
      take: 20, // Limit results
    });

    // Get current user's friendships to check status
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { friendId: currentUserId },
        ],
      },
    });

    // Add friendship status to each user
    const usersWithStatus = users.map((user) => {
      const friendship = friendships.find(
        (f) =>
          (f.userId === currentUserId && f.friendId === user.id) ||
          (f.friendId === currentUserId && f.userId === user.id)
      );

      let status = 'none';
      let type = null;

      if (friendship) {
        status = friendship.status;
        if (status === 'pending') {
          type = friendship.userId === currentUserId ? 'sent' : 'received';
        }
      }

      return {
        ...user,
        friendshipStatus: status,
        requestType: type,
      };
    });

    res.json({
      success: true,
      users: usersWithStatus,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      error: 'Failed to search users',
    });
  }
});

export default router;
