#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const EXCHANGE_RATES = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  MYR: 4.48,
  SGD: 1.34,
  JPY: 149.50,
  AUD: 1.54,
};

const server = new Server(
  { name: 'mcp-quick-calc', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'currency_convert',
      description: 'Convert an amount between currencies (USD, EUR, GBP, MYR, SGD, JPY, AUD)',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount to convert' },
          from: { type: 'string', description: 'Source currency code (e.g. USD)' },
          to: { type: 'string', description: 'Target currency code (e.g. EUR)' },
        },
        required: ['amount', 'from', 'to'],
      },
    },
    {
      name: 'percentage',
      description: 'Calculate percentage: "of" (X% of Y), "change" (% change from value to new_value), "difference" (% difference between two values)',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['of', 'change', 'difference'],
            description: '"of" = value% of total; "change" = % change from value to new_value; "difference" = % difference between value and new_value',
          },
          value: { type: 'number', description: 'The percentage (for "of") or original/first value (for "change"/"difference")' },
          total: { type: 'number', description: 'The whole amount (required for type "of")' },
          new_value: { type: 'number', description: 'The new or second value (required for type "change"/"difference")' },
        },
        required: ['type', 'value'],
      },
    },
    {
      name: 'compound_interest',
      description: 'Calculate compound interest growth, optionally with regular monthly contributions',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'number', description: 'Initial investment amount' },
          rate: { type: 'number', description: 'Annual interest rate as a percentage (e.g. 5 for 5%)' },
          years: { type: 'number', description: 'Number of years' },
          compounds_per_year: { type: 'number', description: 'How many times per year interest compounds (default: 12)' },
          monthly_contribution: { type: 'number', description: 'Regular monthly contribution (default: 0)' },
        },
        required: ['principal', 'rate', 'years'],
      },
    },
    {
      name: 'unit_convert',
      description: 'Convert between common units: km/miles, kg/lbs, C/F, L/gal, m/ft, cm/in',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Value to convert' },
          from_unit: { type: 'string', description: 'Source unit (km, miles, kg, lbs, C, F, L, gal, m, ft, cm, in)' },
          to_unit: { type: 'string', description: 'Target unit (km, miles, kg, lbs, C, F, L, gal, m, ft, cm, in)' },
        },
        required: ['value', 'from_unit', 'to_unit'],
      },
    },
    {
      name: 'loan_payment',
      description: 'Calculate monthly loan payment, total paid, and total interest for a loan',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'number', description: 'Loan amount' },
          annual_rate: { type: 'number', description: 'Annual interest rate as a percentage (e.g. 5 for 5%)' },
          years: { type: 'number', description: 'Loan term in years' },
        },
        required: ['principal', 'annual_rate', 'years'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'currency_convert') {
      const { amount, from, to } = args;
      const fromCode = from.toUpperCase();
      const toCode = to.toUpperCase();

      if (!EXCHANGE_RATES[fromCode]) {
        return { content: [{ type: 'text', text: `Unknown currency: ${from}. Supported: ${Object.keys(EXCHANGE_RATES).join(', ')}` }] };
      }
      if (!EXCHANGE_RATES[toCode]) {
        return { content: [{ type: 'text', text: `Unknown currency: ${to}. Supported: ${Object.keys(EXCHANGE_RATES).join(', ')}` }] };
      }

      const amountInUSD = amount / EXCHANGE_RATES[fromCode];
      const converted = amountInUSD * EXCHANGE_RATES[toCode];

      return {
        content: [{
          type: 'text',
          text: `${amount} ${fromCode} = ${converted.toFixed(4)} ${toCode}\n(Rate: 1 ${fromCode} = ${(EXCHANGE_RATES[toCode] / EXCHANGE_RATES[fromCode]).toFixed(6)} ${toCode})\nNote: Using hardcoded indicative rates, not live data.`,
        }],
      };
    }

    if (name === 'percentage') {
      const { type, value, total, new_value } = args;

      if (type === 'of') {
        if (total === undefined || total === null) {
          return { content: [{ type: 'text', text: 'Error: "total" is required for type "of"' }] };
        }
        const result = (value / 100) * total;
        return { content: [{ type: 'text', text: `${value}% of ${total} = ${result.toFixed(4)}` }] };
      }

      if (type === 'change') {
        if (new_value === undefined || new_value === null) {
          return { content: [{ type: 'text', text: 'Error: "new_value" is required for type "change"' }] };
        }
        if (value === 0) {
          return { content: [{ type: 'text', text: 'Error: original value cannot be 0 for percentage change' }] };
        }
        const change = ((new_value - value) / Math.abs(value)) * 100;
        const direction = change >= 0 ? 'increase' : 'decrease';
        return { content: [{ type: 'text', text: `Percentage change from ${value} to ${new_value} = ${change.toFixed(4)}% (${direction})` }] };
      }

      if (type === 'difference') {
        if (new_value === undefined || new_value === null) {
          return { content: [{ type: 'text', text: 'Error: "new_value" is required for type "difference"' }] };
        }
        const avg = (Math.abs(value) + Math.abs(new_value)) / 2;
        if (avg === 0) {
          return { content: [{ type: 'text', text: 'Error: both values cannot be 0' }] };
        }
        const diff = (Math.abs(value - new_value) / avg) * 100;
        return { content: [{ type: 'text', text: `Percentage difference between ${value} and ${new_value} = ${diff.toFixed(4)}%` }] };
      }

      return { content: [{ type: 'text', text: `Unknown type: ${type}. Use "of", "change", or "difference"` }] };
    }

    if (name === 'compound_interest') {
      const { principal, rate, years } = args;
      const n = args.compounds_per_year ?? 12;
      const monthly = args.monthly_contribution ?? 0;

      const r = rate / 100;
      const rPerPeriod = r / n;
      const totalPeriods = n * years;

      // Compound interest on principal
      const principalGrowth = principal * Math.pow(1 + rPerPeriod, totalPeriods);

      // Future value of regular contributions (annuity formula)
      let contributionGrowth = 0;
      if (monthly > 0 && rPerPeriod > 0) {
        // Monthly contributions, compounded monthly regardless of n (standard annuity)
        const monthlyRate = r / 12;
        const totalMonths = years * 12;
        contributionGrowth = monthly * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
      } else if (monthly > 0) {
        contributionGrowth = monthly * years * 12;
      }

      const finalAmount = principalGrowth + contributionGrowth;
      const totalContributed = principal + monthly * years * 12;
      const totalInterest = finalAmount - totalContributed;

      return {
        content: [{
          type: 'text',
          text: [
            `Compound Interest Calculation:`,
            `  Principal: ${principal.toFixed(2)}`,
            `  Annual rate: ${rate}%`,
            `  Compounds per year: ${n}`,
            `  Years: ${years}`,
            `  Monthly contribution: ${monthly.toFixed(2)}`,
            ``,
            `  Final amount: ${finalAmount.toFixed(2)}`,
            `  Total contributed: ${totalContributed.toFixed(2)}`,
            `  Total interest earned: ${totalInterest.toFixed(2)}`,
          ].join('\n'),
        }],
      };
    }

    if (name === 'unit_convert') {
      const { value, from_unit, to_unit } = args;
      const from = from_unit.toLowerCase();
      const to = to_unit.toLowerCase();

      // Convert to SI base, then to target
      const conversions = {
        // Length (base: meters)
        km: { base: 'length', toBase: v => v * 1000, fromBase: v => v / 1000 },
        miles: { base: 'length', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
        m: { base: 'length', toBase: v => v, fromBase: v => v },
        ft: { base: 'length', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
        cm: { base: 'length', toBase: v => v * 0.01, fromBase: v => v / 0.01 },
        in: { base: 'length', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },

        // Mass (base: kg)
        kg: { base: 'mass', toBase: v => v, fromBase: v => v },
        lbs: { base: 'mass', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },

        // Volume (base: liters)
        l: { base: 'volume', toBase: v => v, fromBase: v => v },
        gal: { base: 'volume', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
      };

      // Temperature handled separately
      if (from === 'c' && to === 'f') {
        const result = (value * 9 / 5) + 32;
        return { content: [{ type: 'text', text: `${value}°C = ${result.toFixed(4)}°F` }] };
      }
      if (from === 'f' && to === 'c') {
        const result = (value - 32) * 5 / 9;
        return { content: [{ type: 'text', text: `${value}°F = ${result.toFixed(4)}°C` }] };
      }
      if (from === 'c' && to === 'c') {
        return { content: [{ type: 'text', text: `${value}°C = ${value}°C` }] };
      }
      if (from === 'f' && to === 'f') {
        return { content: [{ type: 'text', text: `${value}°F = ${value}°F` }] };
      }

      const fromConv = conversions[from];
      const toConv = conversions[to];

      if (!fromConv) {
        return { content: [{ type: 'text', text: `Unknown unit: ${from_unit}. Supported: km, miles, m, ft, cm, in, kg, lbs, C, F, L, gal` }] };
      }
      if (!toConv) {
        return { content: [{ type: 'text', text: `Unknown unit: ${to_unit}. Supported: km, miles, m, ft, cm, in, kg, lbs, C, F, L, gal` }] };
      }
      if (fromConv.base !== toConv.base) {
        return { content: [{ type: 'text', text: `Cannot convert ${from_unit} (${fromConv.base}) to ${to_unit} (${toConv.base}) — incompatible unit types` }] };
      }

      const inBase = fromConv.toBase(value);
      const result = toConv.fromBase(inBase);

      return { content: [{ type: 'text', text: `${value} ${from_unit} = ${result.toFixed(6)} ${to_unit}` }] };
    }

    if (name === 'loan_payment') {
      const { principal, annual_rate, years } = args;

      const monthlyRate = annual_rate / 100 / 12;
      const numPayments = years * 12;

      let monthlyPayment;
      if (monthlyRate === 0) {
        monthlyPayment = principal / numPayments;
      } else {
        monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }

      const totalPaid = monthlyPayment * numPayments;
      const totalInterest = totalPaid - principal;

      return {
        content: [{
          type: 'text',
          text: [
            `Loan Payment Calculation:`,
            `  Principal: ${principal.toFixed(2)}`,
            `  Annual rate: ${annual_rate}%`,
            `  Term: ${years} years (${numPayments} months)`,
            ``,
            `  Monthly payment: ${monthlyPayment.toFixed(2)}`,
            `  Total paid: ${totalPaid.toFixed(2)}`,
            `  Total interest: ${totalInterest.toFixed(2)}`,
          ].join('\n'),
        }],
      };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
