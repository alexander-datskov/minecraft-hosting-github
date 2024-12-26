const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Function to execute shell commands
function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
            } else {
                resolve(stdout ? stdout : stderr);
            }
        });
    });
}

// Function to setup and run the Minecraft server
async function setupMinecraftServer() {
    try {
        // Create the setup.sh file
        const setupScript = `
#!/bin/bash

# Define the port number
PORT=2443

# Update the package list and install Java
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk

# Create a directory for the Minecraft server
mkdir -p ~/minecraft-server
cd ~/minecraft-server

# Download the Minecraft server .jar file
wget https://launcher.mojang.com/v1/objects/7d7efb8e3b38c3c20897ef13ed6cd8f922b807b9/server.jar -O minecraft_server.1.18.2.jar

# Agree to the EULA
echo "eula=true" > eula.txt

# Create server.properties file to specify the port and other settings
cat <<EOL > server.properties
server-port=${PORT}
online-mode=false
enable-command-block=true
allow-flight=true
EOL

# Run the Minecraft server in a screen session
screen -S minecraft -d -m java -Xmx2G -Xms2G -jar minecraft_server.1.18.2.jar nogui

# Wait for the server to start
sleep 10

# Fetch and display the public IP address and port using wget as an alternative method
PUBLIC_IP=$(wget -qO- http://ifconfig.me)
echo "Minecraft server is running at ${PUBLIC_IP}:${PORT}"
        `;
        fs.writeFileSync('setup.sh', setupScript);

        // Make the setup script executable and run it
        console.log(await execShellCommand('chmod +x setup.sh && ./setup.sh'));

        console.log('Minecraft server setup complete.');
    } catch (error) {
        console.error(`Setup error: ${error}`);
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    ws.on('message', message => {
        if (message === 'setup_server') {
            setupMinecraftServer().then(result => {
                ws.send(result);
            }).catch(error => {
                ws.send(error);
            });
        } else if (message === 'version') {
            exec('java -version', (error, stdout, stderr) => {
                if (error) {
                    ws.send(`Error fetching server version: ${error.message}`);
                    return;
                }
                ws.send(`Server Version: ${stderr}`);
            });
        } else {
            exec(`screen -S minecraft -p 0 -X stuff "${message}\r"`, (error, stdout, stderr) => {
                if (error) {
                    ws.send(`Error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    ws.send(`stderr: ${stderr}`);
                    return;
                }
                ws.send(`stdout: ${stdout}`);
            });
        }
    });
});

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
    setupMinecraftServer().then(result => {
        console.log(result);
    }).catch(error => {
        console.error(error);
    });
});
