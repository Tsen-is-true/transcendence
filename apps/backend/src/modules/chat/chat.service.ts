import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly usersService: UsersService,
  ) {}

  async getConversations(userId: number) {
    const messages = await this.messageRepo
      .createQueryBuilder('m')
      .select(
        `CASE WHEN m.senderId = :uid THEN m.receiverId ELSE m.senderId END`,
        'partnerId',
      )
      .addSelect('MAX(m.createdAt)', 'lastMessageAt')
      .where('m.senderId = :uid OR m.receiverId = :uid', { uid: userId })
      .groupBy('partnerId')
      .orderBy('lastMessageAt', 'DESC')
      .getRawMany();

    const conversations = await Promise.all(
      messages.map(async (row) => {
        const partnerId = Number(row.partnerId);

        const lastMessage = await this.messageRepo.findOne({
          where: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
          order: { createdAt: 'DESC' },
        });

        const unreadCount = await this.messageRepo.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            isRead: false,
          },
        });

        const partner = await this.usersService.getPublicProfile(partnerId);

        return {
          partner: partner
            ? {
                userId: partner.userid,
                nickname: partner.nickname,
                avatarUrl: partner.avatarUrl,
                isOnline: partner.isOnline,
              }
            : null,
          lastMessage: lastMessage
            ? {
                messageId: lastMessage.messageId,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return conversations;
  }

  async getMessages(
    userId: number,
    targetId: number,
    before?: string,
    limit: number = 50,
  ) {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :uid AND m.receiverId = :tid) OR (m.senderId = :tid AND m.receiverId = :uid)',
        { uid: userId, tid: targetId },
      );

    if (before) {
      qb.andWhere('m.createdAt < :before', { before: new Date(before) });
    }

    const messages = await qb
      .orderBy('m.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return messages.reverse();
  }

  async markAsRead(userId: number, senderId: number) {
    const result = await this.messageRepo.update(
      { senderId, receiverId: userId, isRead: false },
      { isRead: true },
    );
    return { updatedCount: result.affected || 0 };
  }

  async saveMessage(
    senderId: number,
    receiverId: number,
    content: string,
  ): Promise<Message> {
    const message = this.messageRepo.create({
      senderId,
      receiverId,
      content,
    });
    return this.messageRepo.save(message);
  }
}
