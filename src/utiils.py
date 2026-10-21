def roll_sort_key(roll_number):
    parts = (roll_number or "").split("-")
    if len(parts) >= 3 and parts[0].isdigit() and parts[-1].isdigit():
        return (0, int(parts[0]), parts[1].upper(), int(parts[-1]))
    return (1, 0, "", 0)