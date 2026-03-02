/**
 * Gerenciador de Socket.IO para notificações em tempo real
 * Notifica admin, secretária e representantes sobre chamadas e visitas
 */

class SocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Map<userId, Set<socketId>>
  }

  /**
   * Inicializar Socket.IO com o servidor HTTP
   */
  initialize(server) {
    const { Server } = require('socket.io');
    
    this.io = new Server(server, {
      cors: {
        origin: '*', // Permitir qualquer origem
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    console.log('🔌 Socket.IO inicializado');

    this.setupEventHandlers();
  }

  /**
   * Configurar event handlers do Socket.IO
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 Cliente conectado:', socket.id);

      // Cliente se identifica com userId e role
      socket.on('identify', (data) => {
        const { userId, role } = data;
        console.log(`👤 Cliente identificado: userId=${userId}, role=${role}, socketId=${socket.id}`);
        
        // Armazenar socket do usuário
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);
        
        // Armazenar info no socket para desconexão
        socket.userId = userId;
        socket.userRole = role;

        // Entrar em sala baseada no role
        socket.join(`role:${role}`);
        console.log(`✅ Cliente ${userId} entrou na sala role:${role}`);
      });

      // Desconexão
      socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
        
        if (socket.userId) {
          const sockets = this.userSockets.get(socket.userId);
          if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.userSockets.delete(socket.userId);
            }
          }
        }
      });

      socket.on('adminResponse', (data) => {
        console.log('📢 AdminResponse recebido:', data);

        this.io.to('role:secretary').emit('adminResponseToSecretary', {
          ...data,
          timestamp: Date.now()
        });

        console.log('✅ Resposta do admin enviada para secretarias');
      });
    });
  }

  /**
   * Notificar quando admin chama representante
   * Envia para secretária e para o representante específico
   */
  notifyRepresentativeCalled(data) {
    const { visitId, repName, laboratory, representativeId } = data;
    
    console.log('📢 Emitindo notificação representativeCalled');
    console.log('   - repName:', repName);
    console.log('   - laboratory:', laboratory);
    console.log('   - representativeId:', representativeId);

    // Notificar todas as secretárias
    this.io.to('role:secretary').emit('representativeCalled', {
      visitId,
      repName,
      laboratory,
      timestamp: Date.now()
    });
    console.log('✅ Notificação enviada para secretárias');

    // Notificar o representante específico
    if (representativeId) {
      const repSockets = this.userSockets.get(representativeId);
      if (repSockets && repSockets.size > 0) {
        repSockets.forEach(socketId => {
          this.io.to(socketId).emit('representativeCalled', {
            visitId,
            repName,
            laboratory,
            timestamp: Date.now()
          });
        });
        console.log(`✅ Notificação enviada para representante ${representativeId}`);
      } else {
        console.log(`⚠️ Representante ${representativeId} não está conectado`);
      }
    }
  }

  /**
   * Notificar quando secretária cria visita
   * Envia para admin
   */
  notifyVisitCreatedBySecretary(data) {
    const { visitId, repName, laboratory } = data;
    
    console.log('📢 Emitindo notificação visitCreatedBySecretary');
    console.log('   - visitId:', visitId);
    console.log('   - repName:', repName);
    console.log('   - laboratory:', laboratory);
    console.log('   - Total de sockets conectados:', this.io.sockets.sockets.size);

    // Notificar todos os admins
    this.io.to('role:admin').emit('visitCreatedBySecretary', {
      visitId,
      repName,
      laboratory,
      timestamp: Date.now()
    });
    
    console.log('✅ Notificação "visitCreatedBySecretary" emitida para role:admin');
  }

  /**
   * Notificar mudança de status de visita
   * Envia para todos os admins e secretárias
   */
  notifyVisitStatusChanged(data) {
    const { visitId, status, repName, laboratory } = data;
    
    console.log('📢 Emitindo notificação visitStatusChanged');
    console.log('   - visitId:', visitId);
    console.log('   - status:', status);

    // Notificar admins e secretárias
    this.io.to('role:admin').emit('visitStatusChanged', {
      visitId,
      status,
      repName,
      laboratory,
      timestamp: Date.now()
    });

    this.io.to('role:secretary').emit('visitStatusChanged', {
      visitId,
      status,
      repName,
      laboratory,
      timestamp: Date.now()
    });
    
    console.log('✅ Notificação de mudança de status enviada');
  }

  /**
   * Broadcast genérico para todos os clientes
   */
  broadcast(event, data) {
    console.log(`📢 Broadcasting evento: ${event}`);
    this.io.emit(event, data);
  }

  /**
   * Notificar atraso de médico para representantes
   * Envia para todos os representantes e admin
   */
  notifyDoctorDelay(data) {
    const { doctorId, doctorName, delayMinutes, delayType, message, delayId } = data;
    
    console.log('🚨 Emitindo notificação de atraso de médico');
    console.log('   - doctorName:', doctorName);
    console.log('   - delayMinutes:', delayMinutes);
    console.log('   - delayType:', delayType);

    // Notificar todos os representantes e admin
    this.io.to('role:representante').emit('doctorDelayNotification', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      delayId,
      timestamp: new Date()
    });

    this.io.to('role:admin').emit('doctorDelayNotification', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      delayId,
      timestamp: new Date()
    });

    this.io.to('role:secretary').emit('doctorDelayNotification', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      delayId,
      timestamp: new Date()
    });
    
    console.log('✅ Notificação de atraso enviada para representantes, admin e secretárias');
  }

  /**
   * Notificar atualização de atraso de médico
   */
  notifyDoctorDelayUpdated(data) {
    const { doctorId, doctorName, delayMinutes, delayType, message } = data;
    
    console.log('🔄 Emitindo notificação de atualização de atraso');
    console.log('   - doctorName:', doctorName);
    console.log('   - delayMinutes:', delayMinutes);

    // Notificar todos os representantes e admin
    this.io.to('role:representante').emit('doctorDelayUpdated', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      timestamp: new Date()
    });

    this.io.to('role:admin').emit('doctorDelayUpdated', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      timestamp: new Date()
    });

    this.io.to('role:secretary').emit('doctorDelayUpdated', {
      doctorId,
      doctorName,
      delayMinutes,
      delayType,
      message,
      timestamp: new Date()
    });
    
    console.log('✅ Notificação de atualização de atraso enviada');
  }

  /**
   * Notificar resolução de atraso de médico
   */
  notifyDoctorDelayResolved(data) {
    const { doctorId, doctorName } = data;
    
    console.log('✅ Emitindo notificação de resolução de atraso');
    console.log('   - doctorName:', doctorName);

    // Notificar todos os representantes, admin e secretárias
    this.io.to('role:representante').emit('doctorDelayResolved', {
      doctorId,
      doctorName,
      timestamp: new Date()
    });

    this.io.to('role:admin').emit('doctorDelayResolved', {
      doctorId,
      doctorName,
      timestamp: new Date()
    });

    this.io.to('role:secretary').emit('doctorDelayResolved', {
      doctorId,
      doctorName,
      timestamp: new Date()
    });
    
    console.log('✅ Notificação de resolução de atraso enviada');
  }

  /**
   * Broadcast genérico para todos os clientes
   */
  broadcast(event, data) {
    console.log(`📢 Broadcasting evento: ${event}`);
    this.io.emit(event, data);
  }

  /**
   * Obter instância do Socket.IO
   */
  getIO() {
    if (!this.io) {
      throw new Error('Socket.IO não foi inicializado');
    }
    return this.io;
  }
}

// Singleton
const socketManager = new SocketManager();

module.exports = socketManager;
