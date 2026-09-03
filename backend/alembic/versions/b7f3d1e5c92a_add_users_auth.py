"""add users and profiles.user_id for auth

Revision ID: b7f3d1e5c92a
Revises: a52e4c3a828b
Create Date: 2026-09-03 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'b7f3d1e5c92a'
down_revision: Union[str, None] = 'a52e4c3a828b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table first — profiles.user_id references it.
    op.create_table(
        'users',
        sa.Column('id', UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Existing seeded profiles keep working (user_id stays null until
    # seed_db.py links the demo account).
    op.add_column('profiles', sa.Column('user_id', UUID(), nullable=True))
    op.create_foreign_key(
        'fk_profiles_user_id_users',
        'profiles',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_profiles_user_id', table_name='profiles')
    op.drop_constraint('fk_profiles_user_id_users', 'profiles', type_='foreignkey')
    op.drop_column('profiles', 'user_id')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
