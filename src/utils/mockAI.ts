import { ChatMessage, DatasetProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simulate AI routing: RAG vs Code-gen
function routeQuestion(question: string, profile: DatasetProfile): 'rag' | 'code-gen' | 'general' {
  const q = question.toLowerCase();
  
  // Code-gen patterns: statistics, filtering, aggregation
  const codeGenPatterns = [
    'mean', 'average', 'sum', 'total', 'count', 'max', 'min', 'top', 'bottom',
    'largest', 'smallest', 'distribution', 'group', 'groupby', 'filter', 'compare',
    'percentage', 'ratio', 'chart', 'plot', 'how many', 'how much', 'what is',
  ];
  
  // RAG patterns: meaning, description, context
  const ragPatterns = [
    'meaning', 'means', 'explain', 'describe', 'what does', 'what is', 'why',
    'context', 'about', 'dataset', 'column',
  ];
  
  const hasCodeGen = codeGenPatterns.some(p => q.includes(p));
  const hasRag = ragPatterns.some(p => q.includes(p));
  
  if (hasCodeGen && !hasRag) return 'code-gen';
  if (hasRag && !hasCodeGen) return 'rag';
  if (hasCodeGen && hasRag) return 'code-gen'; // prioritize code-gen
  return 'general';
}

function generatePandasCode(question: string, profile: DatasetProfile): { code: string; explanation: string } {
  const q = question.toLowerCase();
  const numericCols = profile.columns.filter(c => c.dtype === 'number');
  const stringCols = profile.columns.filter(c => c.dtype === 'string');
  const firstNumeric = numericCols[0]?.name || 'value';
  const firstString = stringCols[0]?.name || 'category';
  
  if (q.includes('mean') || q.includes('average')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nresult = df['${firstNumeric}'].mean()\nprint(f"Average: {result:.2f}")`,
      explanation: `Compute the average of column '${firstNumeric}'`,
    };
  }
  
  if (q.includes('total') || q.includes('sum')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nresult = df['${firstNumeric}'].sum()\nprint(f"Total: {result:,.2f}")`,
      explanation: `Compute the sum of column '${firstNumeric}'`,
    };
  }
  
  if (q.includes('largest') || q.includes('max') || q.includes('top')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ntop_10 = df.nlargest(10, '${firstNumeric}')\nprint(top_10)`,
      explanation: `Return the top 10 records with the highest '${firstNumeric}'`,
    };
  }
  
  if (q.includes('smallest') || q.includes('min') || q.includes('bottom')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nbottom_10 = df.nsmallest(10, '${firstNumeric}')\nprint(bottom_10)`,
      explanation: `Return the 10 records with the lowest '${firstNumeric}'`,
    };
  }
  
  if (q.includes('group') || q.includes('breakdown') || q.includes('by category')) {
    const groupCol = firstString;
    const aggCol = firstNumeric;
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ngrouped = df.groupby('${groupCol}')['${aggCol}'].agg(['mean', 'sum', 'count'])\ngrouped = grouped.sort_values('sum', ascending=False)\nprint(grouped)`,
      explanation: `Group by '${groupCol}' and compute mean, sum, count of '${aggCol}'`,
    };
  }
  
  if (q.includes('distribution') || q.includes('percentage') || q.includes('ratio')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ndist = df['${firstString}'].value_counts()\ndist_pct = df['${firstString}'].value_counts(normalize=True) * 100\nresult = pd.DataFrame({'count': dist, 'percentage': dist_pct.round(2)})\nprint(result)`,
      explanation: `Distribution of column '${firstString}'`,
    };
  }
  
  if (q.includes('count') || q.includes('how many') || q.includes('how much')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ntotal_rows = len(df)\nunique_values = df['${firstString}'].nunique()\nnull_count = df['${firstString}'].isnull().sum()\nprint(f"Total rows: {total_rows}")\nprint(f"Unique values: {unique_values}")\nprint(f"Null values: {null_count}")`,
      explanation: `Count total rows, unique values, and null values`,
    };
  }
  
  if (q.includes('compare') || q.includes('versus')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ncomparison = df.groupby('${firstString}')['${firstNumeric}'].agg(['mean', 'median', 'std'])\ncomparison = comparison.sort_values('mean', ascending=False)\nprint(comparison)`,
      explanation: `Compare the average of '${firstNumeric}' across '${firstString}' groups`,
    };
  }
  
  // Default: describe
  return {
    code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\n# Dataset overview\nprint(f"Shape: {df.shape}")\nprint(f"\\nColumns: {list(df.columns)}")\nprint(f"\\nDtypes:\\n{df.dtypes}")\nprint(f"\\nDescribe:\\n{df.describe()}")\nprint(f"\\nNull counts:\\n{df.isnull().sum()}")`,
    explanation: `Dataset overview: shape, columns, dtypes, statistics, null counts`,
  };
}

function generateMockResult(question: string, profile: DatasetProfile): { tableData?: { headers: string[]; rows: string[][] }; chartData?: { labels: string[]; values: number[]; chartType: 'bar' | 'line' | 'pie' } } {
  const q = question.toLowerCase();
  const numericCols = profile.columns.filter(c => c.dtype === 'number');
  const stringCols = profile.columns.filter(c => c.dtype === 'string');
  
  if (q.includes('group') || q.includes('breakdown') || q.includes('distribution') || q.includes('by category')) {
    const groupCol = stringCols[0]?.name || 'Category';
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D', 'E'];
    const labels = samples.slice(0, 5);
    const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
    
    return {
      tableData: {
        headers: [groupCol, 'mean', 'sum', 'count'],
        rows: labels.map((label, i) => [
          label,
          (values[i] / (Math.floor(Math.random() * 20) + 5)).toFixed(2),
          values[i].toLocaleString(),
          String(Math.floor(Math.random() * 50) + 5),
        ]),
      },
      chartData: { labels, values, chartType: 'bar' },
    };
  }
  
  if (q.includes('top') || q.includes('largest') || q.includes('max')) {
    const numCol = numericCols[0]?.name || 'Value';
    const rows = Array.from({ length: 10 }, (_, i) => [
      String(i + 1),
      (Math.random() * 10000).toFixed(2),
      `Item_${Math.floor(Math.random() * 100)}`,
    ]);
    return {
      tableData: {
        headers: ['rank', numCol, 'label'],
        rows,
      },
      chartData: {
        labels: rows.map(r => r[2]),
        values: rows.map(r => parseFloat(r[1])),
        chartType: 'bar',
      },
    };
  }
  
  if (q.includes('compare') || q.includes('versus')) {
    const groupCol = stringCols[0]?.name || 'Category';
    const numCol = numericCols[0]?.name || 'Value';
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D'];
    const labels = samples.slice(0, 4);
    const values = labels.map(() => Math.floor(Math.random() * 500) + 50);
    
    return {
      tableData: {
        headers: [groupCol, `${numCol}_mean`, `${numCol}_median`, `${numCol}_std`],
        rows: labels.map((label, i) => [
          label,
          values[i].toFixed(2),
          (values[i] * 0.9).toFixed(2),
          (values[i] * 0.2).toFixed(2),
        ]),
      },
      chartData: { labels, values, chartType: 'bar' },
    };
  }
  
  if (q.includes('percentage') || q.includes('ratio') || q.includes('pie')) {
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D', 'E'];
    const labels = samples.slice(0, 5);
    const values = labels.map(() => Math.floor(Math.random() * 40) + 10);
    
    return {
      tableData: {
        headers: [stringCols[0]?.name || 'Category', 'count', 'percentage'],
        rows: labels.map((label, i) => [
          label,
          String(values[i] * 10),
          `${((values[i] / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%`,
        ]),
      },
      chartData: { labels, values, chartType: 'pie' },
    };
  }
  
  // Default: summary stats
  if (numericCols.length > 0) {
    return {
      tableData: {
        headers: ['statistic', ...numericCols.map(c => c.name)],
        rows: [
          ['count', ...numericCols.map(c => String(profile.rowCount - c.nullCount))],
          ['mean', ...numericCols.map(c => String(c.mean ?? '-'))],
          ['median', ...numericCols.map(c => String(c.median ?? '-'))],
          ['min', ...numericCols.map(c => String(c.min ?? '-'))],
          ['max', ...numericCols.map(c => String(c.max ?? '-'))],
        ],
      },
    };
  }
  
  return {};
}

function generateRAGResponse(question: string, profile: DatasetProfile): string {
  const q = question.toLowerCase();
  
  if (q.includes('dataset') || q.includes('data') || q.includes('about')) {
    return `📊 **Dataset Overview: ${profile.fileName}**\n\nThis dataset contains ${profile.rowCount.toLocaleString()} records across ${profile.columnCount} columns.\n\n**Main columns:**\n${profile.columns.map(c => `- \`${c.name}\` (${c.dtype}): ${c.uniqueCount} unique values, ${c.nullPercent}% null`).join('\n')}\n\n**Auto analysis:**\n- Numeric columns: ${profile.columns.filter(c => c.dtype === 'number').length}\n- Categorical columns: ${profile.columns.filter(c => c.dtype === 'string').length}\n- File size: ${profile.fileSize}\n\n💡 *This information is inferred from schema and statistics. You can add per-column context for more accurate descriptions.*`;
  }
  
  if (q.includes('meaning') || q.includes('explain') || q.includes('what is')) {
    const mentionedCol = profile.columns.find(c => q.includes(c.name.toLowerCase()));
    if (mentionedCol) {
      return `📋 **Column: \`${mentionedCol.name}\`**\n\n- **Data type:** ${mentionedCol.dtype}\n- **Unique values:** ${mentionedCol.uniqueCount}\n- **Null rate:** ${mentionedCol.nullPercent}%\n- **Sample values:** ${mentionedCol.sampleValues.join(', ')}\n${mentionedCol.dtype === 'number' ? `- **Range:** ${mentionedCol.min} → ${mentionedCol.max}\n- **Mean:** ${mentionedCol.mean}\n- **Median:** ${mentionedCol.median}` : ''}\n\n🔍 *Based on the column name and sample values, this column likely relates to ${mentionedCol.dtype === 'number' ? 'quantitative data' : 'a group/category classifier'}.*\n\n⚠️ *This is an automatic guess. Edit the description in the Schema section to provide an accurate context.*`;
    }
  }
  
  return `🤖 **Analysis from RAG Context:**\n\nBased on the embedded schema and metadata, dataset "${profile.fileName}" shows:\n\n1. **Scale:** ${profile.rowCount.toLocaleString()} rows × ${profile.columnCount} columns\n2. **Data quality:** ${profile.columns.filter(c => c.nullPercent < 5).length}/${profile.columnCount} columns with < 5% missing values\n3. **Diversity:** ${profile.columns.reduce((sum, c) => sum + c.uniqueCount, 0).toLocaleString()} unique values across all columns\n\n💡 *Ask about a specific column or request a numeric analysis!*`;
}

export async function processQuestion(
  question: string,
  profile: DatasetProfile,
): Promise<ChatMessage> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const route = routeQuestion(question, profile);
  const id = uuidv4();
  
  if (route === 'code-gen') {
    const { code, explanation } = generatePandasCode(question, profile);
    const result = generateMockResult(question, profile);
    
    return {
      id,
      role: 'assistant',
      content: `🔧 **Text-to-Pandas Agent**\n\n${explanation}\n\n${result.tableData ? '✅ Query executed successfully. Result:' : '✅ Code generated and ready to run.'}`,
      code,
      tableData: result.tableData,
      chartData: result.chartData,
      timestamp: new Date(),
      type: 'code-gen',
    };
  }
  
  if (route === 'rag') {
    return {
      id,
      role: 'assistant',
      content: generateRAGResponse(question, profile),
      timestamp: new Date(),
      type: 'rag',
    };
  }
  
  // General
  return {
    id,
    role: 'assistant',
    content: `🤔 I understand your question. You can:\n\n1. **Ask about a column** → "What does column X mean?"\n2. **Request a numeric analysis** → "Compute the average of column Y", "Top 10 largest"\n3. **Compare or group** → "Compare Z by group W"\n4. **Dataset overview** → "What is this dataset about?"\n\nTry one of the above!`,
    timestamp: new Date(),
    type: 'general',
  };
}
