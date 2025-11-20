// Event Service - Business logic untuk event broadcasting
class EventService {
    constructor() {
        this.clients = new Set();
        this.clientsByUser = new Map();
    }


    addClient(client, username = null) {
        this.clients.add(client);
        
        if (username) {
            if (!this.clientsByUser.has(username)) {
                this.clientsByUser.set(username, new Set());
            }
            this.clientsByUser.get(username).add(client);
        }
    }

    removeClient(client, username = null) {
        this.clients.delete(client);
        
        if (username && this.clientsByUser.has(username)) {
            this.clientsByUser.get(username).delete(client);
            
            // Hapus entry jika tidak ada client lagi
            if (this.clientsByUser.get(username).size === 0) {
                this.clientsByUser.delete(username);
            }
        }
    }

    broadcastToClients(event, username = null) {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        
        if (username) {
            // Broadcast ke clients untuk user tertentu
            const userClients = this.clientsByUser.get(username);
            if (userClients) {
                console.log(`📤 Broadcasting event "${event.type}" to ${userClients.size} client(s) for user: ${username}`);
                userClients.forEach(client => {
                    try {
                        client.write(message);
                    } catch (error) {
                        console.error(`Error broadcasting to client for ${username}:`, error);
                        userClients.delete(client);
                    }
                });
            } else {
                console.warn(`⚠️ No clients found for user: ${username}. Available users: ${Array.from(this.clientsByUser.keys()).join(', ')}`);
            }
        } else {
            // Broadcast ke semua clients (backward compatibility)
            this.clients.forEach(client => {
                try {
                    client.write(message);
                } catch (error) {
                    console.error('Error broadcasting to client:', error);
                    this.clients.delete(client);
                }
            });
            
            // Juga broadcast ke semua user-specific clients
            this.clientsByUser.forEach((userClients, user) => {
                userClients.forEach(client => {
                    try {
                        client.write(message);
                    } catch (error) {
                        console.error(`Error broadcasting to client for ${user}:`, error);
                        userClients.delete(client);
                    }
                });
            });
        }
    }

    sendStateSync(client, stateData) {
        const syncEvent = {
            type: 'state-sync',
            data: stateData
        };
        
        try {
            client.write(`data: ${JSON.stringify(syncEvent)}\n\n`);
            console.log('📤 State sync sent to new client');
        } catch (error) {
            console.error('Error sending state sync to client:', error);
        }
    }

    getConnectedClientsCount() {
        return this.clients.size;
    }

    getConnectedClientsByUserCount() {
        let total = 0;
        this.clientsByUser.forEach(userClients => {
            total += userClients.size;
        });
        return total;
    }
}

module.exports = new EventService();

