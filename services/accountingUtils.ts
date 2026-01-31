
/**
 * Formats a number as a currency string (0,000.00)
 */
export const formatMoney = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Takes a raw input string and converts it to current accounting format 0,000.00 while typing
 */
export const handleAccountingInput = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "0.00";
    const cents = parseInt(digits);
    return (cents / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Converts formatted string back to a pure number
 */
export const parseAccountingValue = (formattedValue: string): number => {
    if (typeof formattedValue !== 'string') return 0;
    return parseFloat(formattedValue.replace(/,/g, '')) || 0;
};
