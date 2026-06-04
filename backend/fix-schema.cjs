const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\backend\\\\prisma\\\\schema.prisma';

// Read the raw buffer
const buf = fs.readFileSync(file);

// Convert to string and strip out null bytes caused by PowerShell UTF-16LE append
let content = buf.toString('utf8').replace(/\x00/g, '');

// Find where the corrupted model starts and strip it
const index = content.indexOf('model AppNotification');
if (index !== -1) {
  content = content.substring(0, index);
}

// Append the clean UTF-8 block
content += `model AppNotification {
  id          String   @id @default(uuid())
  workspaceId String
  userId      String?
  type        String
  title       String
  message     String
  link        String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user        User?     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([userId])
  @@index([createdAt])
}
`;

fs.writeFileSync(file, content, 'utf8');
console.log('Schema fixed successfully');
