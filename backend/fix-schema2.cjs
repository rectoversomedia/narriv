const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\backend\\\\prisma\\\\schema.prisma';

let content = fs.readFileSync(file, 'utf8');

// Append the new model
const cleanModel = `
model AppNotification {
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

if (!content.includes('model AppNotification')) {
  content += '\n' + cleanModel;
  
  // Now carefully inject the relations
  // In User model:
  content = content.replace('  memberships WorkspaceMember[]\n', '  memberships WorkspaceMember[]\n  appNotifications AppNotification[]\n');
  
  // In Workspace model:
  content = content.replace('  integrations      Integration[]\n', '  integrations      Integration[]\n  appNotifications  AppNotification[]\n');
  
  fs.writeFileSync(file, content, 'utf8');
}
