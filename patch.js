const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\app\\\\(dashboard)\\\\signals\\\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('type DateRangeKey, type PaginationInfo, type Signal', 'type DateRangeKey, type PaginationInfo, type Signal, getSignalsMeta, type SignalsMeta');

content = content.replace('function FollowUpPanel() {', 'function FollowUpPanel({ data }: { data?: SignalsMeta["followUps"] }) {');
content = content.replace(/\{followUps\.map/g, '{(data || followUps).map');

content = content.replace('function RecommendationPanel() {', 'function RecommendationPanel({ data }: { data?: SignalsMeta["recommendations"] }) {');
content = content.replace(/\{recommendations\.map/g, '{(data || recommendations).map');

content = content.replace('function SourceDonut() {', 'function SourceDonut({ data }: { data?: SignalsMeta["sourceDistribution"] }) {');
content = content.replace(/sourceDistribution\.map/g, '(data || sourceDistribution).map');

content = content.replace('function TimelineChart() {', 'function TimelineChart({ data }: { data?: SignalsMeta["timeline"] }) {');
content = content.replace(/makeLinePath\(timeline,/g, 'makeLinePath(data || timeline,');

content = content.replace('function InvestigationQueue() {', 'function InvestigationQueue({ data }: { data?: SignalsMeta["investigationQueue"] }) {');
content = content.replace('const items = [', 'const items = data || [');
content = content.replace('] as const;', '];');

const hookCode = `
  const metaQuery = useQuery({
    queryKey: ["signalsMeta"],
    queryFn: () => getSignalsMeta(),
    staleTime: 60 * 1000,
  });
  const meta = metaQuery.data || undefined;
`;

content = content.replace('const signalsQuery = useQuery({', hookCode + '\n  const signalsQuery = useQuery({');

content = content.replace('<FollowUpPanel />', '<FollowUpPanel data={meta?.followUps} />');
content = content.replace('<RecommendationPanel />', '<RecommendationPanel data={meta?.recommendations} />');
content = content.replace('<SourceDonut />', '<SourceDonut data={meta?.sourceDistribution} />');
content = content.replace('<TimelineChart />', '<TimelineChart data={meta?.timeline} />');
content = content.replace('<InvestigationQueue />', '<InvestigationQueue data={meta?.investigationQueue} />');

fs.writeFileSync(file, content);
console.log('Modifications applied');